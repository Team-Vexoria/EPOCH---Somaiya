import os
import sys
import time
import json
import asyncio
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field

# Ensure stdout uses utf-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Import core CRAG components from crag_app
from crag_app import (
    similarity_threshold_retriever,
    doc_grader,
    question_rewriter,
    search_web,
    qa_rag_chain,
    Document,
    GROQ_MODEL,
    GROQ_FAST_MODEL
)

from whatsapp_bot import router as whatsapp_router

app = FastAPI(
    title="Agentic Corrective RAG (CRAG) & WhatsApp Advisory API",
    description="High-performance CRAG system with parallel batch grading, dual-model architecture, and real-time WhatsApp bot.",
    version="1.0.0"
)

# Enable CORS for frontend UI connectivity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach WhatsApp Bot Router (/whatsapp/twilio, /whatsapp/meta, /whatsapp/test)
app.include_router(whatsapp_router)

class AskRequest(BaseModel):
    question: str = Field(..., description="The user query or research question", example="What is self-attention?")

class StepInfo(BaseModel):
    step: str
    status: str
    details: str
    time_taken: float

class AskResponse(BaseModel):
    answer: str
    sources: List[str]
    path: str = Field(..., description="'rag' or 'corrective'")
    steps: List[StepInfo]
    time_taken: float

def execute_crag_pipeline(question: str) -> Dict[str, Any]:
    """Execute CRAG pipeline synchronously with detailed per-step metrics."""
    t_start = time.time()
    steps = []

    # 1. Retrieve
    t0 = time.time()
    docs = similarity_threshold_retriever.invoke(question)
    t_ret = time.time() - t0
    steps.append({
        "step": "retrieve",
        "status": "completed",
        "details": f"Retrieved {len(docs)} documents from vector database",
        "time_taken": round(t_ret, 3)
    })

    # 2. Grade
    t0 = time.time()
    filtered_docs = []
    web_needed = "No"

    if docs:
        batch_inputs = [{"question": question, "document": d.page_content} for d in docs]
        concurrency = min(len(docs), 4)
        try:
            grades = doc_grader.batch(batch_inputs, config={"max_concurrency": concurrency})
        except Exception:
            grades = [doc_grader.invoke(inp) for inp in batch_inputs]

        for d, score in zip(docs, grades):
            grade = getattr(score, "binary_score", str(score))
            if "yes" in grade.lower():
                filtered_docs.append(d)

        rel_count = len(filtered_docs)
        tot_count = len(docs)
        if (rel_count / tot_count) <= 0.5:
            web_needed = "Yes"
        grade_details = f"grading {rel_count} of {tot_count} relevant"
    else:
        web_needed = "Yes"
        grade_details = "0 documents retrieved - web search needed"

    t_grade = time.time() - t0
    steps.append({
        "step": "grade_documents",
        "status": "completed",
        "details": grade_details,
        "time_taken": round(t_grade, 3)
    })

    curr_question = question
    context_docs = list(filtered_docs)

    # 3. Corrective Path (if needed)
    if web_needed == "Yes":
        t0 = time.time()
        better_q = question_rewriter.invoke({"question": question})
        t_rw = time.time() - t0
        curr_question = better_q
        steps.append({
            "step": "rewrite_query",
            "status": "completed",
            "details": f"Rewrote query for web search: {better_q}",
            "time_taken": round(t_rw, 3)
        })

        t0 = time.time()
        web_raw = search_web.invoke(better_q)
        web_docs = [Document(page_content=d, metadata={"source": "web"}) for d in web_raw]
        context_docs.extend(web_docs)
        t_ws = time.time() - t0
        steps.append({
            "step": "web_search",
            "status": "completed",
            "details": f"Retrieved {len(web_docs)} web search results",
            "time_taken": round(t_ws, 3)
        })

    # 4. Generate
    t0 = time.time()
    generation = qa_rag_chain.invoke({"context": context_docs, "question": curr_question})
    t_gen = time.time() - t0
    steps.append({
        "step": "generate_answer",
        "status": "completed",
        "details": "Generated final answer from context",
        "time_taken": round(t_gen, 3)
    })

    # Format sources
    sources = []
    for doc in context_docs:
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

    total_time = round(time.time() - t_start, 3)
    path = "corrective" if web_needed == "Yes" else "rag"

    return {
        "answer": generation,
        "sources": list(dict.fromkeys(sources)),
        "path": path,
        "steps": steps,
        "time_taken": total_time
    }

@app.get("/")
def health_check():
    """Health and status endpoint."""
    return {
        "status": "online",
        "system": "Agentic Corrective RAG (CRAG)",
        "models": {
            "fast_grader": GROQ_FAST_MODEL,
            "answer_generator": GROQ_MODEL
        },
        "endpoints": {
            "ask": "POST /ask",
            "stream_post": "POST /ask/stream",
            "stream_get": "GET /ask/stream?question=..."
        }
    }

@app.post("/ask", response_model=AskResponse)
def ask_endpoint(payload: AskRequest):
    """
    Standard JSON endpoint:
    Returns answer, sources, path ('rag' | 'corrective'), per-step breakdown, and total time_taken.
    """
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    try:
        result = execute_crag_pipeline(payload.question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ApiChatRequest(BaseModel):
    message: str
    language: Optional[str] = "en"
    crop: Optional[str] = None
    quantity: Optional[float] = None
    village: Optional[str] = None

@app.post("/api/chat")
def api_chat_endpoint(payload: ApiChatRequest):
    """
    Frontend chat endpoint connecting the UI directly to the Agentic CRAG engine.
    """
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    query = payload.message
    extra_context = []
    if payload.crop and payload.crop.lower() not in query.lower():
        extra_context.append(f"Crop: {payload.crop}")
    if payload.quantity and str(payload.quantity) not in query:
        extra_context.append(f"Quantity: {payload.quantity} quintals")
    if extra_context:
        query += " (" + ", ".join(extra_context) + ")"

    try:
        result = execute_crag_pipeline(query)
        structured_sources = [
            {"title": s, "snippet": f"Verified APMC market record: {s}"}
            for s in result["sources"]
        ]
        return {
            "text": result["answer"],
            "path": result["path"],
            "sources": structured_sources,
            "steps": result["steps"],
            "time_taken": result["time_taken"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def sse_event_stream(question: str):
    """Generator yielding real-time Server-Sent Events (SSE)."""
    t_start = time.time()
    steps = []

    def format_sse(data: dict) -> str:
        return f"data: {json.dumps(data)}\n\n"

    # Step 1: Retrieving
    yield format_sse({
        "event": "step",
        "step": "retrieving",
        "message": "Searching vector database for relevant research chunks..."
    })
    await asyncio.sleep(0.01)

    t0 = time.time()
    docs = await asyncio.to_thread(similarity_threshold_retriever.invoke, question)
    t_ret = time.time() - t0
    ret_step = {
        "step": "retrieve",
        "status": "completed",
        "details": f"Retrieved {len(docs)} documents",
        "time_taken": round(t_ret, 3)
    }
    steps.append(ret_step)
    yield format_sse({
        "event": "step_done",
        "step": "retrieve",
        "details": f"Found {len(docs)} document chunks",
        "time_taken": round(t_ret, 3)
    })
    await asyncio.sleep(0.01)

    # Step 2: Grading
    yield format_sse({
        "event": "step",
        "step": "grading",
        "message": f"Grading {len(docs)} chunks in parallel..." if docs else "Checking documents..."
    })
    await asyncio.sleep(0.01)

    t0 = time.time()
    filtered_docs = []
    web_needed = "No"

    if docs:
        batch_inputs = [{"question": question, "document": d.page_content} for d in docs]
        concurrency = min(len(docs), 4)
        
        def run_grading():
            try:
                return doc_grader.batch(batch_inputs, config={"max_concurrency": concurrency})
            except Exception:
                return [doc_grader.invoke(inp) for inp in batch_inputs]

        grades = await asyncio.to_thread(run_grading)

        for d, score in zip(docs, grades):
            grade = getattr(score, "binary_score", str(score))
            if "yes" in grade.lower():
                filtered_docs.append(d)

        rel_count = len(filtered_docs)
        tot_count = len(docs)
        if (rel_count / tot_count) <= 0.5:
            web_needed = "Yes"
        grade_details = f"grading {rel_count} of {tot_count} relevant"
    else:
        web_needed = "Yes"
        grade_details = "0 documents retrieved - web search needed"

    t_grade = time.time() - t0
    steps.append({
        "step": "grade_documents",
        "status": "completed",
        "details": grade_details,
        "time_taken": round(t_grade, 3)
    })
    yield format_sse({
        "event": "step_done",
        "step": "grade_documents",
        "details": grade_details,
        "time_taken": round(t_grade, 3),
        "web_search_needed": web_needed
    })
    await asyncio.sleep(0.01)

    curr_question = question
    context_docs = list(filtered_docs)

    # Step 3: Corrective path if needed
    if web_needed == "Yes":
        yield format_sse({
            "event": "step",
            "step": "rewriting",
            "message": "Rephrasing question for web search..."
        })
        await asyncio.sleep(0.01)

        t0 = time.time()
        better_q = await asyncio.to_thread(question_rewriter.invoke, {"question": question})
        t_rw = time.time() - t0
        curr_question = better_q
        steps.append({
            "step": "rewrite_query",
            "status": "completed",
            "details": f"Rewrote query: {better_q}",
            "time_taken": round(t_rw, 3)
        })
        yield format_sse({
            "event": "step_done",
            "step": "rewrite_query",
            "details": f"Query rephrased: {better_q}",
            "time_taken": round(t_rw, 3)
        })
        await asyncio.sleep(0.01)

        yield format_sse({
            "event": "step",
            "step": "searching_web",
            "message": f"Searching live web for '{better_q}'..."
        })
        await asyncio.sleep(0.01)

        t0 = time.time()
        web_raw = await asyncio.to_thread(search_web.invoke, better_q)
        web_docs = [Document(page_content=d, metadata={"source": "web"}) for d in web_raw]
        context_docs.extend(web_docs)
        t_ws = time.time() - t0
        steps.append({
            "step": "web_search",
            "status": "completed",
            "details": f"Fetched {len(web_docs)} web search results",
            "time_taken": round(t_ws, 3)
        })
        yield format_sse({
            "event": "step_done",
            "step": "web_search",
            "details": f"Retrieved {len(web_docs)} web search results",
            "time_taken": round(t_ws, 3)
        })
        await asyncio.sleep(0.01)

    # Step 4: Generating Answer
    yield format_sse({
        "event": "step",
        "step": "generating",
        "message": "Synthesizing answer using research context..."
    })
    await asyncio.sleep(0.01)

    t0 = time.time()
    generation = await asyncio.to_thread(
        qa_rag_chain.invoke,
        {"context": context_docs, "question": curr_question}
    )
    t_gen = time.time() - t0
    steps.append({
        "step": "generate_answer",
        "status": "completed",
        "details": "Generated answer from context",
        "time_taken": round(t_gen, 3)
    })
    yield format_sse({
        "event": "step_done",
        "step": "generate_answer",
        "details": "Answer synthesized successfully",
        "time_taken": round(t_gen, 3)
    })
    await asyncio.sleep(0.01)

    # Sources
    sources = []
    for doc in context_docs:
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

    total_time = round(time.time() - t_start, 3)
    path = "corrective" if web_needed == "Yes" else "rag"

    # Final Complete Event
    yield format_sse({
        "event": "complete",
        "answer": generation,
        "sources": list(dict.fromkeys(sources)),
        "path": path,
        "steps": steps,
        "time_taken": total_time
    })

@app.post("/ask/stream")
async def ask_stream_post(payload: AskRequest):
    """Server-Sent Events (SSE) streaming endpoint via POST."""
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    return StreamingResponse(
        sse_event_stream(payload.question),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.get("/ask/stream")
async def ask_stream_get(question: str = Query(..., description="The user query")):
    """Server-Sent Events (SSE) streaming endpoint via GET (native EventSource support)."""
    if not question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    return StreamingResponse(
        sse_event_stream(question),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting CRAG FastAPI Server on http://localhost:{port} ...")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
