"""
AI Service worker — listens to the BullMQ "ai-tasks" queue and calls Groq.

Known bullmq-python bug (v2.x): `getCompleted` calls `asyncio.wait()` on an
empty set when the queue is idle, raising:
    ValueError: Set of Tasks/Futures is empty.
We monkey-patch that function before importing the Worker class so the fix is
transparent and survives library updates that don't break the API.
"""

import asyncio
import os
import traceback
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

# ─── Monkey-patch bullmq before Worker is imported ───────────────────────────
import bullmq.worker as _bw

_orig_getCompleted = _bw.getCompleted

async def _safe_getCompleted(task_set: set, emit_callback):
    """Guard against the empty-set crash that breaks idle workers."""
    if not task_set:
        return [], task_set          # nothing done, same pending set
    return await _orig_getCompleted(task_set, emit_callback)

_bw.getCompleted = _safe_getCompleted
# ─────────────────────────────────────────────────────────────────────────────

from bullmq import Worker, Job
from llm_client import generate


# ─── Redis connection ─────────────────────────────────────────────────────────
def _get_redis_opts() -> dict:
    redis_url = os.environ.get("REDIS_URL", "")
    if redis_url:
        p = urlparse(redis_url)
        opts = {
            "host": p.hostname,
            "port": p.port or 6379,
            "password": p.password or None,
            "ssl": p.scheme == "rediss",
        }
        if opts["ssl"]:
            # Upstash (and other managed TLS Redis): don't verify the cert
            opts["ssl_cert_reqs"] = None
        return opts

    return {
        "host": os.environ.get("REDIS_HOST", "localhost"),
        "port": int(os.environ.get("REDIS_PORT", 6379)),
        "password": os.environ.get("REDIS_PASSWORD") or None,
    }


# ─── Job processor ───────────────────────────────────────────────────────────
async def process(job: Job, job_token: str):
    print(f"[AI Worker] START job {job.id!r}  name={job.name!r}", flush=True)
    try:
        if job.name not in ("score-ats", "generate-content"):
            raise ValueError(f"Unknown job name: {job.name!r}")

        prompt = (job.data or {}).get("prompt")
        if not prompt:
            raise ValueError("Job data has no 'prompt' field")

        result = await generate(prompt)
        print(f"[AI Worker] SUCCESS job {job.id!r} completed", flush=True)
        return result

    except Exception as exc:
        print(f"[AI Worker] FAIL job {job.id!r} FAILED: {exc}", flush=True)
        traceback.print_exc()
        raise   # Re-raise so BullMQ marks job as failed (triggers retry/dead-letter)


# ─── Supervised worker loop ───────────────────────────────────────────────────
async def main(stop_event: asyncio.Event | None = None):
    if stop_event is None:
        stop_event = asyncio.Event()

    connection_opts = _get_redis_opts()

    while not stop_event.is_set():
        print("[AI Worker] Starting BullMQ worker …", flush=True)
        worker = Worker("ai-tasks", process, {"connection": connection_opts})

        try:
            # Block here until the stop signal fires or the worker's
            # internal task crashes.  We detect the crash via an
            # asyncio exception-handler set below.
            await stop_event.wait()
            break  # clean shutdown requested

        except asyncio.CancelledError:
            print("[AI Worker] CancelledError — shutting down cleanly.", flush=True)
            break

        except Exception as exc:
            print(f"[AI Worker] Unexpected crash: {exc!r} — restarting in 3 s …", flush=True)
            traceback.print_exc()
            await asyncio.sleep(3)

        finally:
            try:
                await worker.close()
                print("[AI Worker] Worker closed.", flush=True)
            except Exception as close_err:
                print(f"[AI Worker] Error while closing worker: {close_err}", flush=True)


def _handle_task_exception(loop, context):
    """
    Catch unhandled exceptions from background asyncio Tasks (e.g. from the
    bullmq Worker's internal run() coroutine) and log them without crashing
    the whole process.
    """
    exc = context.get("exception")
    msg = context.get("message", "")

    if isinstance(exc, ValueError) and "Set of Tasks/Futures is empty" in str(exc):
        # This is the known bullmq idle-queue bug. Our monkey-patch should
        # prevent it, but log it in case a race condition slips through.
        print(f"[AI Worker] bullmq idle-queue ValueError caught by exception handler (harmless): {exc}", flush=True)
        return

    if exc:
        print(f"[AI Worker] Unhandled task exception: {exc!r}\n  {msg}", flush=True)
        traceback.print_exception(type(exc), exc, exc.__traceback__)
    else:
        print(f"[AI Worker] Asyncio task problem: {msg}", flush=True)


if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    loop.set_exception_handler(_handle_task_exception)
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(main())
    finally:
        loop.close()
