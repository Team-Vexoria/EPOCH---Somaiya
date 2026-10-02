"""
main.py - Entrypoint for EPOCH Somaiya Backend Server
Runs the high-performance Agentic Corrective RAG (CRAG) system with SSE streaming.
"""

from server import app

if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting CRAG FastAPI Server on http://localhost:{port} ...")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)
