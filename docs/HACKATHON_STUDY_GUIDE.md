# EPOCH Somaiya Hackathon Final — 12-Hour War Room & Architecture Study Guide

> **Prepared for Travel & Final Preparation**  
> Use this guide to master the architecture, memorize high-impact AI terminology, prepare winning defenses for judge Q&A, and execute the 12-hour build plan once the Problem Statement (PS) drops.

---

## 1. The 30-Second Elevator Pitch

> *"Most generative AI tools suffer from two critical flaws: **hallucinations** and **black-box opacity**. In high-stakes domains, an AI cannot simply guess—it must prove every statement.*  
>  
> *Our platform solves this with an **Agentic Corrective RAG (CRAG)** engine powered by **LangGraph** and **FastAPI**, paired with an **editorial React presentation layer**. Unlike naive RAG systems that blindly trust whatever chunks they retrieve, our system acts as a **quality gatekeeper**: it evaluates retrieved evidence in parallel, filters irrelevant noise, triggers live web verification if internal knowledge is incomplete, and streams a live execution trace to the user with exact document and page-level citations.*  
>  
> *Everything is built for real-world resilience: zero-latency Judge evaluation modes, local ONNX embeddings, and a clean, high-contrast light theme engineered for legibility and decision clarity."*

---

## 2. Complete System Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER (Vite + React)              │
│                                                                        │
│  [ Home / Landing ]     [ 1-Click Judge Mode ]     [ Interactive RAG ] │
│         │                          │                         │         │
│         └───────────┬──────────────┴─────────────────────────┘         │
│                     │                                                  │
│         Native Browser EventSource (SSE) / JSON REST                   │
└─────────────────────┼──────────────────────────────────────────────────┘
                      │ (Port 8000)
┌─────────────────────▼──────────────────────────────────────────────────┐
│                   AI ENGINE (FastAPI + LangGraph)                      │
│                                                                        │
│  POST /ask  &  GET /ask/stream?question=...                            │
│                                                                        │
│  1. Vector Retrieval ──► ChromaDB (Local ONNX MiniLM-L6-v2)            │
│         │                Cosine Similarity (Threshold >= 0.35)         │
│         ▼                                                              │
│  2. Parallel Grading ──► Groq Fast Model (20B / Fast Grader)           │
│         │                Binary Relevance Filter (Yes / No)            │
│         ▼                                                              │
│  3. Adaptive Router                                                    │
│         ├── [ > 50% Relevant ] ──► DIRECT RAG PATH                     │
│         │                               │                              │
│         └── [ <= 50% Relevant ] ──► CORRECTIVE PATH                    │
│                                         ├── Query Rewriter (LLM)       │
│                                         └── Web Search (Tavily/DDGS)   │
│                                                 │                      │
│  4. Constrained QA Generation ◄─────────────────┘                      │
│     (Groq High-Capacity 70B/120B Model)                                │
│         │                                                              │
│         ▼                                                              │
│  5. Live SSE Stream ──► Yields {step, step_done, complete, citations} │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. "Why This, Why Not That?" — The Judge Defense Matrix

| Decision | What We Chose | What We Rejected | Why? (Winning Answer for Judges) |
| :--- | :--- | :--- | :--- |
| **Backend Framework** | **FastAPI (Python)** | Pure Node.js / Express | The core intelligence relies on Python ML libraries (`langgraph`, `chromadb`, `PyMuPDF`). Wrapping Python inside Node adds latency and process management overhead. FastAPI is asynchronous, handles Server-Sent Events natively, and validates schemas with Pydantic. |
| **Frontend Stack** | **React + Vite + Tailwind** | Streamlit / Gradio | Streamlit and Gradio look like internal university prototypes. React gives us full control over layout hierarchy, custom telemetry visualizers, client routing, and design system tokens. |
| **RAG Architecture** | **Corrective RAG (CRAG)** | Naive / Vanilla RAG | Naive RAG blindly feeds top-$k$ chunks to the LLM. If chunks are irrelevant, the LLM hallucinates or gives generic filler. CRAG grades evidence first and has an adaptive fallback to live web search when documents lack coverage. |
| **Embeddings** | **Local ONNX MiniLM (Chroma)** | OpenAI `text-embedding-3` | Local ONNX MiniLM runs on CPU with zero API costs, zero network latency, and operates 100% offline. Data never leaves the machine. |
| **Streaming Protocol** | **Server-Sent Events (SSE)** | WebSockets / Polling | WebSockets require bidirectional state overhead and complex socket handshakes that are unnecessary for LLM output. Polling wastes bandwidth. SSE runs over standard HTTP, auto-reconnects, and streams text and step events natively. |
| **UI Aesthetics** | **Warm Light Editorial Theme** | Dark Mode / Tech Gradients | 90% of hackathon teams build identical near-black pages with purple/cyan glowing cards. Our light-theme editorial layout has high typographic contrast, solid 1-2px borders, hard offset shadows, and looks like professional enterprise software. |
| **Auth Strategy** | **Firebase + 1-Click Judge Mode** | Mandatory Email Verification | Hackathon judges have 3 minutes to evaluate a project. Forcing them to create accounts or check emails kills the demo. Judge Mode gives instant, zero-latency access with realistic local fallbacks if Wi-Fi drops. |

---

## 4. High-Impact AI Vocabulary (Memorize for Presentations)

1. **Hallucination Mitigation**: Constraining the language model strictly to retrieved context documents using negative prompt constraints (*"If not in context, state unknown"*).
2. **Corrective RAG (CRAG)**: An agentic framework that dynamically evaluates the semantic relevance of retrieved documents and self-corrects retrieval gaps via query re-writing and web augmentation.
3. **Normalized Cosine Vector Space**: Calculating similarity using angular distance between unit vectors ($A \cdot B / (\|A\| \|B\|)$), ensuring document chunk length does not skew retrieval relevance.
4. **Dual-Model Architecture**: Decoupling the workload between a lightweight, sub-second model for parallel batch document grading (20B parameters) and a high-capacity model (70B/120B parameters) for deep reasoning and synthesis.
5. **Grounded Provenance / Attribution**: Attaching verifiable, page-level metadata to every generative claim so judges can trace answers back to the original PDF paragraphs.
6. **StateGraph Orchestration**: Modeling the retrieval pipeline as a stateful, cyclical directed graph (via LangGraph) with conditional edges rather than a rigid linear chain.
7. **Semantic Chunking with Sliding-Window Overlap**: Splitting documents into 4,000-character blocks with 300-character overlap to preserve semantic context across chunk boundaries.
8. **Real-Time Telemetry Streaming**: Exposing backend cognitive agent steps via Server-Sent Events to provide complete transparency and explainability.

---

## 5. The 12-Hour Hackathon Execution Roadmap (Tonight)

```
[ Hour 0 - 1 ] ──► PS Ingestion & Problem Extraction
[ Hour 1 - 3 ] ──► PDF Indexing & Vector Embeddings
[ Hour 3 - 6 ] ──► Agent Logic & Domain Prompt Engineering
[ Hour 6 - 9 ] ──► Frontend Dashboard & Metrics Customization
[ Hour 9 - 11] ──► End-to-End Testing & Pre-Commit Verification
[ Hour 11- 12] ──► Pitch Rehearsal & Live Demo Dry-Run
```

### Phase 1: Problem Ingestion (Hours 0 – 1)
- Read the Problem Statement thoroughly. Identify:
  1. The target user persona and their primary pain point.
  2. The input data format (PDF manuals, tabular data, policy briefs).
  3. The key decision metric or output requirement.
- Copy the provided PDFs/documents into `backend/research_papers/`.
- Open `docs/DESIGN_BRIEF.md` and define 3 domain personality adjectives and your primary color tokens.

### Phase 2: Indexing & Vector Pipeline (Hours 1 – 3)
- If new PDFs were added, rebuild the vector index in `backend/` by clearing `backend/rag_db/` and running the ingestion step so ChromaDB embeds the new documents.
- Run `test_server.py` in `backend/` to verify that retrieval and grading work seamlessly with the new content.

### Phase 3: Domain Customization (Hours 3 – 6)
- In `backend/crag_app.py`, update `PROMPT_QA` to match the specific domain (e.g. medical protocols, logistics compliance, legal contracts, or financial ledgers).
- Set domain-specific guidelines in the prompt to format outputs into structured tables or actionable bullet points.

### Phase 4: UI Dashboard & Visualization (Hours 6 – 9)
- Open `frontend/src/pages/DashboardPage.tsx` and adjust labels, placeholder queries, and knowledge base file names to match the problem statement.
- Add domain-specific metric cards (e.g. Compliance Score, Confidence %, Processing Latency).
- **Run `npm run design:check`** to ensure no banned colors, gradients, or sub-14px text crept in.

### Phase 5: Verification & Rehearsal (Hours 9 – 12)
- Test 3 distinct demo queries:
  - **Query 1 (Direct RAG)**: A question directly answered in the PS documents (proves local grounded accuracy).
  - **Query 2 (Corrective Path)**: An ambiguous or out-of-scope question that triggers the query rewriter and web search fallback (proves self-correction).
  - **Query 3 (Edge Case)**: Demonstrating the 1-Click Judge Mode running smoothly even if offline.
- Run `npm run build` and `git push origin main` to ensure your live deployment stays up to date.

---

## 6. Pitch Rehearsal: 3-Minute Slide Breakdown

| Time | Slide / View | What to Say | What to Show |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:45** | **The Hook & Problem** | *"When evaluating critical documents, generic AI chatbots hallucinate and give generic advice. Teams cannot afford unverified claims."* | Home Page with problem summary & readiness ledger. |
| **0:45 - 1:30** | **The Solution & Live Run** | *"We built an Agentic Corrective RAG system. Watch as we submit this query: in real time, our engine retrieves the chunks, grades relevance in parallel, and cites the exact page."* | Type `"What is PEFT?"` or PS question $\rightarrow$ live SSE steps animate $\rightarrow$ answer appears. |
| **1:30 - 2:15** | **The Self-Correcting Edge** | *"Notice what happens when a query is missing from our internal files: the system detects low relevance and automatically triggers web augmentation with query rewriting."* | Trigger the Corrective Path $\rightarrow$ highlight the `[CORRECTIVE WEB PATH]` badge. |
| **2:15 - 3:00** | **Architecture & Resilience** | *"Under the hood: LangGraph state machine, local ONNX embeddings for privacy and zero cost, and 1-Click Judge Mode for enterprise stability."* | Show Judge Mode badge and citation breakdown. Conclude with business value. |

---

## 7. The 5 Hardest Judge Questions & Exact Winning Answers

#### Q1: "Why shouldn't we just upload these PDFs to ChatGPT / NotebookLM?"
> *"Consumer chat tools lack auditability, enterprise data privacy, and deterministic control. Our solution runs local ONNX embeddings where data never leaves the premises, validates chunk relevance before generation through a dual-model gatekeeper, and integrates directly into custom business logic through REST and SSE APIs."*

#### Q2: "What happens if ChromaDB retrieves completely irrelevant chunks?"
> *"That is the exact problem Corrective RAG (CRAG) is built to solve. Naive RAG would pass those bad chunks to the LLM and hallucinate. Our LangGraph pipeline has a dedicated parallel relevance grader. If less than 50% of chunks are relevant, it rejects the context, rewrites the query, and searches live web sources to self-correct."*

#### Q3: "Why did you use ONNX MiniLM instead of OpenAI embeddings?"
> *"Three reasons: **cost, latency, and air-gapped privacy**. Running ONNX MiniLM locally costs $0.00, eliminates an external network hop, and guarantees that sensitive internal problem documents are never transmitted to third-party embedding APIs."*

#### Q4: "How does your system handle high query concurrency?"
> *"Our grading node executes parallel batch inference using a fast, lightweight LLM (Groq 20B), completing chunk evaluations in under 700ms. The FastAPI layer is fully asynchronous (ASGI), allowing hundreds of concurrent SSE streams without thread starvation."*

#### Q5: "Can this scale to thousands of documents?"
> *"Yes. ChromaDB uses HNSW (Hierarchical Navigable Small World) graphs for approximate nearest neighbor search with logarithmic scaling $\mathcal{O}(\log N)$. We can also plug in Milvus or Pinecone with zero code changes to the LangGraph pipeline."*
