"""
main.py - Entrypoint for EPOCH Somaiya Backend Server
Runs the high-performance Agentic Corrective RAG (CRAG) system with SSE streaming.
"""
import os
import sys

_backend_dir = os.path.dirname(os.path.abspath(__file__))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from server import app

if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting CRAG FastAPI Server on http://localhost:{port} ...")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)
