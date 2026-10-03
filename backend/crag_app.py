"""
crag_app.py - Agentic Corrective RAG (CRAG) for Nashik Mandi Crop Advisory.

Powered by LangGraph, Groq, and ChromaDB ONNX Embeddings.
Vector store: ../data/chroma_db  (collection: nashik_mandi_advisory)

Exposes ask_crag(question: str) -> dict with keys:
  - answer: str
  - path: "rag" | "corrective"
  - sources: list[str]
  - rewritten_question: str

Can be imported directly into FastAPI or CLI applications.
"""

import os
import sys
import time
import requests
from pathlib import Path
import logging

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
from typing import List, TypedDict, Optional, Any
from operator import itemgetter
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Silence Chroma telemetry errors
os.environ["ANONYMIZED_TELEMETRY"] = "False"
logging.getLogger("chromadb.telemetry.posthog").setLevel(logging.CRITICAL)
logging.getLogger("chromadb.telemetry").setLevel(logging.CRITICAL)

# Load environment variables
load_dotenv()

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langchain_chroma import Chroma
from langgraph.graph import StateGraph, END
from chromadb.utils import embedding_functions

from villages import (
    VILLAGES,
    freight_context_for_prompt,
    resolve_village_name,
    resolve_village_from_text,
)

# ---------------------------------------------------------
# Configuration and Constants
# ---------------------------------------------------------
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_FAST_MODEL = os.environ.get("GROQ_FAST_MODEL", "openai/gpt-oss-20b")
LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "https://api.groq.com/openai/v1")
LLM_API_KEY = os.environ.get("LLM_API_KEY") or os.environ.get("GROQ_API_KEY", "")
TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "")

SCORE_THRESHOLD = 0.01
MAX_WEB_CHARS = 1600

# Resolve path relative to this file so it works regardless of cwd
_BACKEND_DIR = Path(__file__).resolve().parent
PERSIST_DIRECTORY = str(_BACKEND_DIR / ".." / "data" / "chroma_db")
COLLECTION_NAME = "nashik_mandi_advisory"

# ---------------------------------------------------------
# Local Embeddings (Free ONNX all-MiniLM-L6-v2)
# ---------------------------------------------------------
class ChromaLocalMiniLMEmbeddings(Embeddings):
    """
    Local ONNX MiniLM embeddings using ChromaDB's built-in DefaultEmbeddingFunction.
    Replaces OpenAI embeddings without requiring PyTorch or an embedding API key.
    """
    def __init__(self):
        self.ef = embedding_functions.DefaultEmbeddingFunction()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        embeddings = self.ef(texts)
        return [list(map(float, vec)) for vec in embeddings]

    def embed_query(self, text: str) -> List[float]:
        embedding = self.ef([text])[0]
        return list(map(float, embedding))

embed_model = ChromaLocalMiniLMEmbeddings()

# ---------------------------------------------------------
# Vector Database & Retriever
# ---------------------------------------------------------
def get_vector_db():
    return Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embed_model,
        persist_directory=PERSIST_DIRECTORY,
        collection_metadata={"hnsw:space": "cosine"}
    )

chroma_db = get_vector_db()
similarity_threshold_retriever = chroma_db.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 4}
)

# ---------------------------------------------------------
# LLM Initialization & Rate-Limit Retry Helper
# ---------------------------------------------------------
effective_key = LLM_API_KEY if LLM_API_KEY and LLM_API_KEY != "your_groq_api_key_here" else "gsk_placeholder_for_compilation"

# Primary high-capacity model (for final answer generation)
llm = ChatOpenAI(
    model=GROQ_MODEL,
    temperature=0,
    base_url=LLM_BASE_URL,
    api_key=effective_key,
    max_retries=3
)
chatgpt = llm  # Variable name matching reference tutorial

# Fast, lightweight model for high-throughput parallel document grading (sub-second latency)
llm_fast = ChatOpenAI(
    model=GROQ_FAST_MODEL,
    temperature=0,
    base_url=LLM_BASE_URL,
    api_key=effective_key,
    max_retries=3
)

def retry_llm_call(func, *args, **kwargs):
    """Exponential backoff retry wrapper for LLM calls (handles 429/rate-limit)."""
    max_retries = 3
    delay = 2
    for attempt in range(max_retries):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            err = str(e)
            if "rate_limit" in err.lower() or "429" in err:
                if attempt < max_retries - 1:
                    print(f"Rate limit encountered. Retrying in {delay}s... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(delay)
                    delay *= 2
                    continue
            if "model_not_found" in err.lower() or ("model" in err.lower() and "invalid" in err.lower()):
                print(f"\n[Groq Model Error] The model '{GROQ_MODEL}' was rejected by Groq.")
                print("Please copy a valid model name (such as 'llama-3.3-70b-versatile') from https://console.groq.com/docs/models and update GROQ_MODEL in your .env file.\n")
                raise
            if "context_length_exceeded" in err.lower() or ("token" in err.lower() and "limit" in err.lower()):
                print(f"\n[Token Limit Warning] Retrying with trimmed context...")
                continue
            raise

# ---------------------------------------------------------
# Workflows: Grader, QA RAG, Rephraser, Web Search
# ---------------------------------------------------------
class GradeDocuments(BaseModel):
    """Binary score for relevance check on retrieved documents."""
    binary_score: str = Field(description="Documents are relevant to the question, 'yes' or 'no'")

# Fast structured grader powered by lightweight model
structured_llm_grader = llm_fast.with_structured_output(GradeDocuments)

SYS_PROMPT_GRADER = """You are an expert agricultural grader assessing whether a retrieved APMC mandi document satisfies a user's question.

CRITICAL RULES:
1. If the user is specifically asking for TODAY'S, CURRENT, LIVE, LATEST spot price (e.g. 'today', 'live', 'current', 'latest', 'spot', 'आजचा', 'आताचा', 'आज का', 'ताजा भाव', '2025', '2026'), and the retrieved document only contains historical archive data (2014-2016 APMC records), you MUST grade it as 'no' because it cannot provide today's live rate without web search.
2. If the user is asking about historical dataset year, baseline forecasts, holding rules, transport comparisons, or general crop price patterns, and the document is about that crop and mandi, grade it as 'yes'.
3. Your grade MUST be either 'yes' or 'no'."""

grade_prompt = ChatPromptTemplate.from_messages([
    ("system", SYS_PROMPT_GRADER),
    ("human", """Retrieved document:
{document}

User question:
{question}""")
])

doc_grader = (grade_prompt | structured_llm_grader).with_retry(stop_after_attempt=3)

# 2. QA RAG Chain
PROMPT_QA = """You are Mohra (स्मार्ट कृषी सल्लागार), an expert AI agricultural market advisor for farmers and traders in Nashik District, Maharashtra.

CORE DATASET CONTEXT & TRANSPARENCY:
- Our primary APMC historical dataset covers the years 2014–2016 for Nashik district mandis (Lasalgaon, Pimpalgaon, Malegaon, Kopargaon, Ahmednagar, Satana, Rahuri, etc.) across Onion, Tomato, and Soybean.
- Live Spot Rates: When context contains live Agmarknet / APMC web search results, extract and lead with the most recent verified spot rates.

STRICT ACCURACY & PRESENTATION RULES:
1. LATEST DATE & FACTUAL ACCURACY (CRITICAL):
   - When context contains live APMC / Agmarknet search results, scan snippets for their REPORTING DATES.
   - Always extract and quote data from the MOST RECENT / LATEST dated report (e.g., September/October 2026).
   - Extract exact figures:
     • Reported Date (उदा. 1 ऑक्टोबर 2026)
     • Modal Price (मोडल / सरासरी दर) in ₹/quintal and ₹/kg (1 quintal = 100 kg)
     • Minimum and Maximum Price Range (किमान - कमाल दर)
     • Total Arrivals / Volume (if reported)
   - Never hallucinate, invent, or guess prices. Quote exact numbers from the verified snippet.
2. DYNAMIC VILLAGE FREIGHT & NET RETURN:
   - If the context contains a 'Farmer's Origin / Transport costs calculated FROM the farmer's village' table, USE THOSE EXACT VILLAGE-SPECIFIC DISTANCES AND FREIGHT COSTS (₹/quintal).
   - Explain: Net Return = Mandi Price - Village Transport Freight - Spoilage Loss.
   - Recommend the mandi that yields the highest NET return in hand, not just highest gross rate.
3. DOMAIN STORAGE & SPOILAGE:
   - Factor in crop perishability (e.g. ventilated chawl for onions with ~1.2% weekly shrinkage vs immediate 24-48h sale for tomatoes, dry godown for soybeans).
4. CLEAN HUMAN ADVISORY STRUCTURE:
   - Begin with a warm, natural conversational greeting and state the exact spot price immediately.
   - Present price details in clean, scannable bullet points (e.g. • **मोडल दर (Modal Price):** ₹X / क्विंटल (₹X / किलो)).
   - Strictly NO raw ASCII pipe tables, NO horizontal divider lines (---), NO asterisk footnotes (*Range reflects...), and NO raw URLs or bracketed citations.
5. STRICT LANGUAGE MATCHING:
   - If the user's question is in English, answer entirely in English.
   - If the user's question is in Marathi (मराठी), answer in fluent, respectful Marathi with standard agricultural terms.
   - If the user's question is in Hindi (हिंदी), answer in Hindi.

Context:
{context}

Question:
{question}

Answer:"""

prompt_template = ChatPromptTemplate.from_template(PROMPT_QA)

import re

def sanitize_response_text(text: str) -> str:
    """Clean up any raw bracketed links, URLs, double pipes, or formatting artifacts from model output."""
    if not text:
        return ""
    # Strip bracketed search citation markers like 【https://...】 or 【1】
    text = re.sub(r"【.*?】", "", text)
    # Convert markdown links [Label](url) to plain Label
    text = re.sub(r"\[([^\]]+)\]\(https?://[^\)]+\)", r"\1", text)
    # Strip any stray raw URLs
    text = re.sub(r"https?://\S+", "", text)
    # Fix accidental single-line double-pipe table glitches (e.g. || Rahuri | -> \n| Rahuri |)
    text = re.sub(r"\|\|\s*", "\n| ", text)
    # Remove raw horizontal rule lines (--- or ___) that clutter the assistant message
    text = re.sub(r"^[ \t]*[-_]{3,}[ \t]*$", "", text, flags=re.MULTILINE)
    # Normalize excess blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def format_docs(docs):
    formatted = []
    total_chars = 0
    MAX_TOTAL_CONTEXT = 4500  # Generous context budget for detailed price feeds
    for doc in docs:
        content = doc.page_content.strip() if hasattr(doc, 'page_content') else str(doc).strip()
        if total_chars + len(content) > MAX_TOTAL_CONTEXT:
            remaining = MAX_TOTAL_CONTEXT - total_chars
            if remaining > 60:
                formatted.append(content[:remaining] + "...")
            break
        formatted.append(content)
        total_chars += len(content)
    return "\n\n".join(formatted)

base_qa_chain = (
    {"context": (itemgetter('context') | RunnableLambda(format_docs)), "question": itemgetter('question')}
    | prompt_template
    | chatgpt
    | StrOutputParser()
    | RunnableLambda(sanitize_response_text)
)

def _qa_rag_call(inputs: dict) -> str:
    key = os.environ.get("LLM_API_KEY") or os.environ.get("GROQ_API_KEY", "")
    if not key or key == "your_groq_api_key_here":
        print("[Action Needed] Please set GROQ_API_KEY in .env to generate answers.")
        return "Add GROQ_API_KEY to .env to generate responses."
    return retry_llm_call(lambda: base_qa_chain.invoke(inputs))

qa_rag_chain = RunnableLambda(_qa_rag_call)

# 3. Query Rephraser for Live Agricultural Search
SYS_PROMPT_REWRITE = """You are an expert agricultural query optimizer for Indian APMC mandi price searches.
Your task:
- Extract the crop name (e.g. Onion, Tomato, Soybean) and the mandi/region name (e.g. Lasalgaon, Pimpalgaon, Malegaon, Maharashtra).
- Construct a natural, highly effective search query targeting official APMC daily modal price records.
- Format: "{{mandi}} APMC {{crop}} mandi price today per quintal modal rate"
- Examples:
  • "What is the live tomato rate today in Pimpalgaon?" -> "Pimpalgaon APMC tomato mandi price today per quintal modal rate"
  • "What is the live onion modal price in Lasalgaon APMC today?" -> "Lasalgaon APMC onion mandi price today per quintal modal rate"
  • "What is the current soybean price in Maharashtra APMC mandis?" -> "Maharashtra APMC soybean mandi price today per quintal modal rate"
- Output ONLY the clean query string, with no quotes or extra text."""

re_write_prompt = ChatPromptTemplate.from_messages([
    ("system", SYS_PROMPT_REWRITE),
    ("human", """Here is the initial question:
{question}

Formulate an improved question.""")
])

base_rewriter = re_write_prompt | llm_fast | StrOutputParser()

def _rewriter_call(inputs: dict) -> str:
    key = os.environ.get("LLM_API_KEY") or os.environ.get("GROQ_API_KEY", "")
    if not key or key == "your_groq_api_key_here":
        print("[Action Needed] Please set GROQ_API_KEY in .env to rewrite queries.")
        return inputs["question"]
    return retry_llm_call(lambda: base_rewriter.invoke(inputs))

question_rewriter = RunnableLambda(_rewriter_call)

# 4. Web Search Tool (Direct Tavily HTTP API with Fast Fallback)
@tool
def search_web(query: str) -> list:
    """Search the web for live agricultural market data, Agmarknet rates, and news."""
    tavily_key = os.environ.get("TAVILY_API_KEY", "")
    target_query = query.strip()

    if tavily_key and tavily_key != "your_tavily_api_key_here":
        try:
            resp = requests.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": tavily_key,
                    "query": target_query,
                    "max_results": 4,
                    "search_depth": "basic",
                    "include_answer": True
                },
                timeout=4.5
            )
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])
                snippets = []
                for r in results:
                    title = r.get("title", "")
                    content = r.get("content", "")
                    if content:
                        clean_snippet = content[:MAX_WEB_CHARS].replace("\n", " ").strip()
                        snippets.append(f"Mandi Live Report ({title}): {clean_snippet}")
                if snippets:
                    print(f"---TAVILY SEARCH RETURNED {len(snippets)} HIGH-PRECISION LIVE RESULTS---")
                    return snippets
        except Exception as e:
            print(f"Tavily search API error ({e}). Falling back to DuckDuckGo...")

    # Fallback to DuckDuckGo
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            results = list(ddgs.text(target_query, max_results=4))
            return [r.get("body", "")[:MAX_WEB_CHARS] for r in results if r.get("body")]
    except Exception as e:
        print(f"DuckDuckGo search error ({e}). Returning empty results.")
        return []

# ---------------------------------------------------------
# State Schema & Node Functions
# ---------------------------------------------------------
class GraphState(TypedDict, total=False):
    """
    question: question
    generation: LLM response generation
    web_search_needed: flag 'Yes'/'No'
    documents: list of context documents
    village: optional farmer village origin id
    """
    question: str
    generation: str
    web_search_needed: str
    documents: List[Any]
    village: Optional[str]

def retrieve(state: GraphState) -> dict:
    t_start = time.time()
    print("---RETRIEVAL FROM VECTOR DB---")
    documents = similarity_threshold_retriever.invoke(state["question"])
    elapsed = time.time() - t_start
    print(f"---NODE TIME (retrieve): {elapsed:.2f}s ({len(documents)} docs retrieved)---")
    return {"documents": documents}

def grade_documents(state: GraphState) -> dict:
    t_start = time.time()
    print("---CHECK DOCUMENT RELEVANCE TO QUESTION---")
    question = state["question"]
    documents = state.get("documents", [])
    RELEVANCE_THRESHOLD = 0.5
    filtered_docs = []
    web_search_needed = "No"
    total_irrelevant = 0

    if documents:
        # Grade chunks in parallel with concurrency limit (3 to 5)
        batch_inputs = [{"question": question, "document": d.page_content} for d in documents]
        concurrency_limit = min(len(documents), 4)
        try:
            grades = doc_grader.batch(batch_inputs, config={"max_concurrency": concurrency_limit})
        except Exception as e:
            print(f"Parallel grading retry/fallback: {e}")
            grades = [doc_grader.invoke(inp) for inp in batch_inputs]

        for d, score in zip(documents, grades):
            grade = getattr(score, "binary_score", str(score))
            if "yes" in grade.lower():
                print("---GRADE: DOCUMENT RELEVANT---")
                filtered_docs.append(d)
            else:
                print("---GRADE: DOCUMENT NOT RELEVANT---")
                total_irrelevant += 1

        relevance_frac = 1 - (total_irrelevant / len(documents))
        if relevance_frac <= RELEVANCE_THRESHOLD:
            X = (1 - relevance_frac) * 100
            print(f"---SEVERAL DOCUMENTS ({X:.0f}%) ARE NOT RELEVANT TO QUESTION - WEB SEARCH NEEDED---")
            web_search_needed = "Yes"
        else:
            X = relevance_frac * 100
            print(f"---MOST DOCUMENTS ({X:.0f}%) ARE RELEVANT TO QUESTION - WEB SEARCH NOT NEEDED---")
    else:
        print("---NO DOCUMENTS RETRIEVED - WEB SEARCH NEEDED---")
        web_search_needed = "Yes"

    elapsed = time.time() - t_start
    print(f"---NODE TIME (grade_documents): {elapsed:.2f}s (parallel batch graded {len(documents)} docs)---")
    return {"documents": filtered_docs, "web_search_needed": web_search_needed}

def rewrite_query(state: GraphState) -> dict:
    t_start = time.time()
    print("---REWRITE QUERY---")
    better_question = question_rewriter.invoke({"question": state["question"]})
    elapsed = time.time() - t_start
    print(f"---NODE TIME (rewrite_query): {elapsed:.2f}s---")
    return {"question": better_question}

def web_search(state: GraphState) -> dict:
    t_start = time.time()
    print("---WEB SEARCH---")
    question = state["question"]
    documents = list(state.get("documents", []))
    docs = search_web.invoke(question)
    web_results = [Document(page_content=d, metadata={"source": "Live Agmarknet Web Search"}) for d in docs]
    documents.extend(web_results)
    elapsed = time.time() - t_start
    print(f"---NODE TIME (web_search): {elapsed:.2f}s---")
    return {"documents": documents}

def generate_answer(state: GraphState) -> dict:
    t_start = time.time()
    print("---GENERATE ANSWER---")
    context_docs = list(state.get("documents", []))
    v_id = state.get("village") or resolve_village_from_text(state["question"])
    if v_id and v_id in VILLAGES:
        v_ctx = freight_context_for_prompt(v_id)
        if v_ctx:
            v_name = VILLAGES[v_id]["name"]
            v_doc = Document(
                page_content=v_ctx,
                metadata={"source": f"Dynamic Village Freight Matrix ({v_name})"}
            )
            context_docs.insert(0, v_doc)

    generation = qa_rag_chain.invoke({"context": context_docs, "question": state["question"]})
    elapsed = time.time() - t_start
    print(f"---NODE TIME (generate_answer): {elapsed:.2f}s---")
    return {"generation": generation, "documents": context_docs}

def generate_or_search(state: GraphState) -> str:
    print("---ASSESS GRADED DOCUMENTS---")
    if state["web_search_needed"] == "Yes":
        print("---DECISION: SOME or ALL DOCUMENTS ARE NOT RELEVANT TO QUESTION, REWRITE QUERY---")
        return "rewrite_query"
    else:
        print("---DECISION: GENERATE RESPONSE---")
        return "generate_answer"

# ---------------------------------------------------------
# Compile Workflow Graph
# ---------------------------------------------------------
agentic_rag = StateGraph(GraphState)
agentic_rag.add_node("retrieve", retrieve)
agentic_rag.add_node("grade_documents", grade_documents)
agentic_rag.add_node("rewrite_query", rewrite_query)
agentic_rag.add_node("web_search", web_search)
agentic_rag.add_node("generate_answer", generate_answer)

agentic_rag.set_entry_point("retrieve")
agentic_rag.add_edge("retrieve", "grade_documents")
agentic_rag.add_conditional_edges("grade_documents", generate_or_search, ["rewrite_query", "generate_answer"])
agentic_rag.add_edge("rewrite_query", "web_search")
agentic_rag.add_edge("web_search", "generate_answer")
agentic_rag.add_edge("generate_answer", END)
compiled_crag_app = agentic_rag.compile()

# ---------------------------------------------------------
# Public API
# ---------------------------------------------------------
def ask_crag(question: str, village: Optional[str] = None) -> dict:
    """
    Run the Agentic CRAG workflow on a given question.
    Optionally accepts a village (id or name) to compute village-origin specific freight.

    Returns:
        dict: {
            "answer": str,
            "path": "rag" | "corrective",
            "sources": list[str],
            "rewritten_question": str,
            "village": Optional[str]
        }
    """
    initial_question = question
    v_id = ""
    if village:
        v_id = resolve_village_name(village) or resolve_village_from_text(village)
    if not v_id:
        v_id = resolve_village_from_text(question)

    t_pipeline = time.time()
    input_state: dict = {"question": question}
    if v_id:
        input_state["village"] = v_id

    res = compiled_crag_app.invoke(input_state)
    total_time = time.time() - t_pipeline
    print(f"---TOTAL PIPELINE TIME: {total_time:.2f}s---")

    web_needed = res.get("web_search_needed") == "Yes"
    path = "corrective" if web_needed else "rag"
    rewritten_q = res.get("question", initial_question) if path == "corrective" else initial_question

    sources = []
    for doc in res.get("documents", []):
        mandi = doc.metadata.get("mandi")
        crop = doc.metadata.get("crop")
        if mandi and crop:
            sources.append(f"{mandi} APMC ({crop.title()})")
        else:
            src = doc.metadata.get("source", "web")
            if src.startswith("Dynamic"):
                sources.append(src)
            elif src == "web" or not src:
                sources.append("Agmarknet APMC Records")
            else:
                page = doc.metadata.get("page")
                base = os.path.basename(src)
                sources.append(f"{base} (page {page + 1})" if page is not None else base)
    sources = list(dict.fromkeys(sources))

    return {
        "answer": res.get("generation", ""),
        "path": path,
        "sources": sources,
        "rewritten_question": rewritten_q,
        "village": v_id or None
    }

if __name__ == "__main__":
    test_q = sys.argv[1] if len(sys.argv) > 1 else "Where should I sell 20 quintals of onion from Nashik this month?"
    print(f"Testing ask_crag with: {test_q}")
    out = ask_crag(test_q)
    print("\nResult:")
    print("Path:", out["path"])
    print("Sources:", out["sources"])
    print("Answer:\n", out["answer"])
