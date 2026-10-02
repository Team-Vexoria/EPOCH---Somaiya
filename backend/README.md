# RAG Agent Backend (FastAPI)

Lightweight Python backend server configured for CORS and document-grounded query processing.

## Quick Start

1. **Create and activate a virtual environment**:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the server**:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

4. **Verify**:
   - Healthcheck: `http://localhost:8000/api/health`
   - Interactive Swagger Docs: `http://localhost:8000/docs`

## Importing Your RAG Agent

Open `backend/main.py` and replace the placeholder inside `query_rag_agent()` with your existing RAG agent chain/class:

```python
from your_rag_script import answer_query

@app.post("/api/rag/query", response_model=QueryResponse)
async def query_rag_agent(request: QueryRequest):
    result = answer_query(request.query)
    return QueryResponse(
        answer=result["answer"],
        sources=result["citations"]
    )
```
