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
from pathlib import Path
import logging

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
from typing import List, TypedDict, Optional
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

# ---------------------------------------------------------
# Configuration and Constants
# ---------------------------------------------------------
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_FAST_MODEL = os.environ.get("GROQ_FAST_MODEL", "openai/gpt-oss-20b")
LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "https://api.groq.com/openai/v1")
LLM_API_KEY = os.environ.get("LLM_API_KEY") or os.environ.get("GROQ_API_KEY", "")
TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "")

SCORE_THRESHOLD = 0.01  # Low threshold: ONNX MiniLM cosine scores are 0.02–0.39 for domain docs; LLM grader handles filtering
MAX_WEB_CHARS = 4000

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
    search_type="similarity_score_threshold",
    search_kwargs={"k": 5, "score_threshold": SCORE_THRESHOLD}
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
                print(f"\n[Token Limit Exceeded] Context limit reached: {err}")
                return "Context length exceeded. Please reduce chunk size or document count."
            raise

# ---------------------------------------------------------
# Workflows: Grader, QA RAG, Rephraser, Web Search
# ---------------------------------------------------------
class GradeDocuments(BaseModel):
    """Binary score for relevance check on retrieved documents."""
    binary_score: str = Field(description="Documents are relevant to the question, 'yes' or 'no'")

# Fast structured grader powered by lightweight model
structured_llm_grader = llm_fast.with_structured_output(GradeDocuments)

SYS_PROMPT_GRADER = """You are an expert grader assessing relevance of a retrieved document to a user question.
Follow these instructions for grading:
  - If the document contains keyword(s) or semantic meaning related to the question, grade it as relevant.
  - The overall grade should focus more on the semantic meaning rather than just individual words.
  - Your grade should be either 'yes' or 'no' to indicate whether the document is relevant to the question or not."""

grade_prompt = ChatPromptTemplate.from_messages([
    ("system", SYS_PROMPT_GRADER),
    ("human", """Retrieved document:
{document}

User question:
{question}""")
])

doc_grader = (grade_prompt | structured_llm_grader).with_retry(stop_after_attempt=3)

# 2. QA RAG Chain
PROMPT_QA = """You are a Nashik-region agricultural market advisory assistant.
You help farmers and traders make data-driven decisions about when, where, and how to sell their crops (onion, tomato, soyabean) across APMC mandis within ~200 km of Nashik, Maharashtra.

Use the following retrieved context — which contains historical monthly mandi prices, transport cost estimates, seasonal trends, and storage/spoilage guidance — to answer the question.

Rules:
- If the context contains price ranges or confidence levels, always surface them.
- Always mention the relevant mandi name(s) and time periods.
- Express prices in ₹/quintal. Express distances in km.
- If the context is insufficient, say so honestly — never invent prices or recommendations.
- When advising, factor in transport cost (~₹3/km/quintal) and crop-specific spoilage risk.
- Keep the tone practical and farmer-friendly.

Question:
{question}

Context:
{context}

Answer:"""

prompt_template = ChatPromptTemplate.from_template(PROMPT_QA)

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

base_qa_chain = (
    {"context": (itemgetter('context') | RunnableLambda(format_docs)), "question": itemgetter('question')}
    | prompt_template
    | chatgpt
    | StrOutputParser()
)

def _qa_rag_call(inputs: dict) -> str:
    key = os.environ.get("LLM_API_KEY") or os.environ.get("GROQ_API_KEY", "")
    if not key or key == "your_groq_api_key_here":
        print("[Action Needed] Please set GROQ_API_KEY in .env to generate answers.")
        return "Add GROQ_API_KEY to .env to generate responses."
    return retry_llm_call(lambda: base_qa_chain.invoke(inputs))

qa_rag_chain = RunnableLambda(_qa_rag_call)

# 3. Query Rephraser
SYS_PROMPT_REWRITE = """Act as a question re-writer and perform the following task:
 - Convert the following input question to a better version that is optimized for web search.
 - Before re-writing, look at the input question and try to reason about the underlying semantic intent / meaning and then re-write it."""

re_write_prompt = ChatPromptTemplate.from_messages([
    ("system", SYS_PROMPT_REWRITE),
    ("human", """Here is the initial question:
{question}

Formulate an improved question.""")
])

base_rewriter = re_write_prompt | llm | StrOutputParser()

def _rewriter_call(inputs: dict) -> str:
    key = os.environ.get("LLM_API_KEY") or os.environ.get("GROQ_API_KEY", "")
    if not key or key == "your_groq_api_key_here":
        print("[Action Needed] Please set GROQ_API_KEY in .env to rewrite queries.")
        return inputs["question"]
    return retry_llm_call(lambda: base_rewriter.invoke(inputs))

question_rewriter = RunnableLambda(_rewriter_call)

# 4. Web Search Tool (Tavily with DuckDuckGo fallback)
try:
    from langchain_tavily import TavilySearch
    tavily_search = TavilySearch(max_results=6, search_depth="advanced", include_answer=False, include_raw_content=True)
except Exception:
    tavily_search = None

@tool
def search_web(query: str) -> list:
    """Search the web for a query. Useful for general information or general news."""
    tavily_key = os.environ.get("TAVILY_API_KEY", "")
    if tavily_search and tavily_key and tavily_key != "your_tavily_api_key_here":
        try:
            results = tavily_search.invoke({"query": query})
            docs = [r["raw_content"] for r in results.get("results", [])]
            docs = [d for d in docs if d is not None]
            docs = [d[:MAX_WEB_CHARS] for d in docs[:6]]
            if docs:
                return docs
        except Exception as e:
            print(f"Tavily search failed ({e}). Falling back to DuckDuckGo...")

    # Fallback to DuckDuckGo (no key required)
    try:
        from ddgs import DDGS
        ddgs = DDGS()
        results = list(ddgs.text(query, max_results=6))
        docs = [r.get("body", "") for r in results if r.get("body")]
        docs = [d[:MAX_WEB_CHARS] for d in docs[:6]]
        return docs
    except Exception as e:
        print(f"DuckDuckGo search error ({e}). Returning empty results.")
        return []

# ---------------------------------------------------------
# State Schema & Node Functions
# ---------------------------------------------------------
class GraphState(TypedDict):
    """
    question: question
    generation: LLM response generation
    web_search_needed: flag 'Yes'/'No'
    documents: list of context documents
    """
    question: str
    generation: str
    web_search_needed: str
    documents: List[str]

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
    web_results = [Document(page_content=d, metadata={"source": "web"}) for d in docs]
    documents.extend(web_results)
    elapsed = time.time() - t_start
    print(f"---NODE TIME (web_search): {elapsed:.2f}s---")
    return {"documents": documents}

def generate_answer(state: GraphState) -> dict:
    t_start = time.time()
    print("---GENERATE ANSWER---")
    generation = qa_rag_chain.invoke({"context": state.get("documents", []), "question": state["question"]})
    elapsed = time.time() - t_start
    print(f"---NODE TIME (generate_answer): {elapsed:.2f}s---")
    return {"generation": generation}

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
def ask_crag(question: str) -> dict:
    """
    Run the Agentic CRAG workflow on a given question.

    Returns:
        dict: {
            "answer": str,
            "path": "rag" | "corrective",
            "sources": list[str],
            "rewritten_question": str
        }
    """
    initial_question = question
    t_pipeline = time.time()
    res = compiled_crag_app.invoke({"question": question})
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
            if src == "web" or not src:
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
        "rewritten_question": rewritten_q
    }

if __name__ == "__main__":
    test_q = sys.argv[1] if len(sys.argv) > 1 else "Where should I sell 20 quintals of onion from Nashik this month?"
    print(f"Testing ask_crag with: {test_q}")
    out = ask_crag(test_q)
    print("\nResult:")
    print("Path:", out["path"])
    print("Sources:", out["sources"])
    print("Answer:\n", out["answer"])
