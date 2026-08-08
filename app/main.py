from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from app.database import Database
from app.services import JobService
from app.worker import Worker
from app.models import JobStatus


app = FastAPI(title="NEXUS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


database = Database()
database.create_tables()

job_service = JobService(database)
worker = Worker(database)


class JobRequest(BaseModel):
    id: str
    type: str
    body: dict


class FailureModeRequest(BaseModel):
    failure: str


def serialize_job(job):
    return {
        "id": job.id,
        "type": job.type,
        "body": job.body,
        "status": job.status.value,
        "attempts": job.attempts,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
        "completed_at": job.completed_at,
    }


@app.get("/")
def health_check():
    return {
        "system": "NEXUS",
        "status": "running",
    }


# =========================================================
# JOB OPERATIONS
# =========================================================

@app.post("/jobs")
def create_job(request: JobRequest):
    job, created = job_service.accept_job(
        job_id=request.id,
        job_type=request.type,
        body=request.body,
    )

    return {
        "created": created,
        "job": serialize_job(job),
    }


@app.post("/jobs/{job_id}/start")
def start_job(job_id: str):
    job = job_service.start_job(job_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    return {"job": serialize_job(job)}


@app.post("/jobs/{job_id}/complete")
def complete_job(job_id: str):
    job = job_service.complete_job(job_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    return {"job": serialize_job(job)}


@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    job = database.get_job(job_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    return {"job": serialize_job(job)}


@app.get("/jobs/{job_id}/history")
def get_job_history(job_id: str):
    job = database.get_job(job_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    history = database.get_job_history(job_id)

    return {
        "job_id": job_id,
        "history": [
            {
                "id": row[0],
                "status": row[2],
                "attempts": row[3],
                "timestamp": row[4],
            }
            for row in history
        ],
    }


@app.post("/jobs/{job_id}/process")
def process_job(job_id: str):
    job = worker.process_job(job_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "message": "Job processed",
        "job": serialize_job(job),
    }


@app.post("/jobs/{job_id}/retry")
def retry_job(job_id: str):
    job = database.get_job(job_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != JobStatus.RETRYING:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Job cannot be retried from status "
                f"{job.status.value}. Only RETRYING jobs can be retried."
            ),
        )

    database.retry_job(job_id)
    updated_job = database.get_job(job_id)

    return {
        "message": "Job moved back to pending queue",
        "job": serialize_job(updated_job),
    }


# =========================================================
# WORKER OPERATIONS
# =========================================================

@app.post("/worker/process")
def process_next_job():
    job = worker.process_next_job()

    if job is None:
        return {
            "message": "No pending jobs available",
            "job": None,
        }

    return {
        "message": "Job processed successfully",
        "job": serialize_job(job),
    }


@app.get("/worker/status")
def worker_status():
    return {
        "worker": worker.get_state(),
    }


@app.post("/worker/restart")
def restart_worker():
    state = worker.restart()

    return {
        "message": "Worker restarted",
        "worker": state,
    }


@app.post("/worker/slow")
def slow_worker():
    result = worker.set_failure_mode("slow_worker")

    return {
        "message": "Slow worker mode enabled",
        "worker": worker.get_state(),
        "result": result,
    }


@app.post("/worker/crash")
def crash_worker_once():
    result = worker.set_failure_mode("worker_crash")

    return {
        "message": "Worker crash simulation armed for the next job",
        "worker": worker.get_state(),
        "result": result,
    }


@app.post("/worker/failure-mode")
def trigger_failure(request: FailureModeRequest):
    mode_map = {
        "worker_crash": "worker_crash",
        "crash_always": "crash_always",
        "slow_worker": "slow_worker",
        "duplicate_delivery": "duplicate_delivery",
    }

    mode = mode_map.get(request.failure)

    if mode is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown failure mode: {request.failure}",
        )

    result = worker.set_failure_mode(mode)

    return {
        "message": f"Failure mode '{request.failure}' enabled",
        "worker": worker.get_state(),
        "result": result,
    }


# =========================================================
# DASHBOARD
# =========================================================

@app.get("/dashboard")
def get_dashboard():
    jobs = database.get_all_jobs()

    counts = {
        "PENDING": 0,
        "PROCESSING": 0,
        "COMPLETED": 0,
        "RETRYING": 0,
        "DEAD_LETTER": 0,
    }

    for job in jobs:
        if job.status.value in counts:
            counts[job.status.value] += 1

    waiting_jobs = [
        job for job in jobs
        if job.status == JobStatus.PENDING
    ]

    oldest_waiting_job = None

    if waiting_jobs:
        oldest_waiting_job = min(
            waiting_jobs,
            key=lambda job: job.created_at,
        )

    recent_activity = []

    for job in jobs[:10]:
        recent_activity.append({
            "job_id": job.id,
            "status": job.status.value,
            "attempts": job.attempts,
            "timestamp": (
                job.updated_at.isoformat()
                if job.updated_at
                else job.created_at.isoformat()
                if job.created_at
                else None
            ),
        })

    return {
        "counts": counts,
        "queue": {
            "waiting": counts["PENDING"],
            "oldest_job": (
                oldest_waiting_job.id
                if oldest_waiting_job
                else None
            ),
            "waiting_since": (
                oldest_waiting_job.created_at.isoformat()
                if oldest_waiting_job and oldest_waiting_job.created_at
                else None
            ),
        },
        "worker": worker.get_state(),
        "recent_activity": recent_activity,
    }
