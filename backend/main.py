import os
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="EPOCH Somaiya — RAG Agent Backend",
    version="1.0.0",
    description="Backend API server for RAG agent integration and document query processing."
)

# Enable CORS for local Vite frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str
    document_id: Optional[str] = None

class QueryResponse(BaseModel):
    answer: str
    sources: List[str]
    status: str = "success"

@app.get("/api/health")
async def health_check():
    """Health status endpoint used by frontend to detect backend readiness."""
    return {
        "status": "healthy",
        "service": "epoch-rag-backend",
        "version": "1.0.0"
    }

@app.post("/api/rag/query", response_model=QueryResponse)
async def query_rag_agent(request: QueryRequest):
    """
    RAG Query Endpoint.
    
    INTEGRATION INSTRUCTIONS:
    Import and call your existing RAG agent here:
    
    Example:
        from rag_agent import my_rag_chain
        response = my_rag_chain.run(request.query)
        return QueryResponse(answer=response.text, sources=response.citations)
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    # Placeholder demonstration response until your RAG agent is imported
    return QueryResponse(
        answer=f"Verified grounded analysis for '{request.query}'. Attach your custom RAG agent logic in backend/main.py.",
        sources=[
            "Problem_Statement_Brief.pdf (Sec 2.1)",
            "Somaiya_Hackathon_Rubric.pdf (p. 3)"
        ]
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
