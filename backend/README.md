# Agentic Corrective RAG (CRAG) Backend

High-performance **Corrective Retrieval Augmented Generation (CRAG)** engine built with **LangGraph**, **Groq LLM**, and local **ONNX MiniLM embeddings** in ChromaDB.

Exposes JSON API endpoints and live Server-Sent Events (SSE) streaming for real-time frontend execution traces.

## Architecture

1. **Vector Retrieval**: Cosine similarity search against ChromaDB (`./rag_db`).
2. **Document Relevance Grading**: Fast parallel batch grading of retrieved chunks.
3. **Adaptive Routing**:
   - If $\ge 50\%$ chunks are relevant: takes the **Direct RAG Path**.
   - If $< 50\%$ chunks are relevant: takes the **Corrective Path** (Query Rephrasing + Tavily / DuckDuckGo live web search).
4. **Constrained Answer Generation**: High-capacity model synthesizes the answer with strict grounding rules to eliminate hallucinations.

## Quick Start

1. **Activate virtual environment**:
   You can use the pre-configured virtual environment or create one:
   ```powershell
   # If reusing rag_system_test venv:
   & "c:\Projects\rag_system_test\venv\Scripts\Activate.ps1"
   # Or create local venv:
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure `.env`**:
   Ensure your `backend/.env` has your `GROQ_API_KEY`:
   ```ini
   GROQ_API_KEY=gsk_...
   GROQ_MODEL=openai/gpt-oss-120b
   GROQ_FAST_MODEL=openai/gpt-oss-20b
   ```

3. **Run Server**:
   ```bash
   python server.py
   # or: uvicorn server:app --reload --port 8000
   ```

## Endpoints

- `GET /`: Health and model status.
- `POST /ask`: Synchronous JSON response with answer, sources, path (`rag` | `corrective`), and per-step latency metrics.
- `GET /ask/stream?question=...` & `POST /ask/stream`: Live Server-Sent Events (SSE) streaming progress events (`step`, `step_done`, `complete`).
