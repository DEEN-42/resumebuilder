"""
FastAPI entry-point for the AI microservice.
Starts the BullMQ worker as a background asyncio task on startup.
Run with:  py -3.12 -m uvicorn app:app --reload --port 8000
"""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from worker import main as run_worker, _handle_task_exception


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Start the BullMQ worker when the server starts; stop it on shutdown."""
    # Install the custom exception handler so internal bullmq task crashes
    # are logged instead of silently swallowed or propagated as unhandled.
    loop = asyncio.get_running_loop()
    loop.set_exception_handler(_handle_task_exception)

    stop_event = asyncio.Event()
    worker_task = asyncio.create_task(run_worker(stop_event), name="ai-bullmq-worker")

    def _log_failure(task: asyncio.Task):
        try:
            exc = task.exception()
        except (asyncio.CancelledError, asyncio.InvalidStateError):
            return
        if exc:
            print(f"[AI Service] Worker task exited with: {exc!r}", flush=True)

    worker_task.add_done_callback(_log_failure)
    print("[AI Service] BullMQ worker started.", flush=True)

    yield  # ← server is running

    # Graceful shutdown
    stop_event.set()
    try:
        await asyncio.wait_for(worker_task, timeout=10)
    except (asyncio.TimeoutError, asyncio.CancelledError):
        worker_task.cancel()
    print("[AI Service] BullMQ worker stopped.", flush=True)


app = FastAPI(title="AI Microservice", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok"}
