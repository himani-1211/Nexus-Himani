import time

from app.database import Database
from app.models import JobStatus


class Worker:

    MAX_ATTEMPTS = 3

    def __init__(self, database: Database):
        self.database = database

        # Operator-controlled simulation modes.
        self.slow_mode = False
        self.crash_once = False
        self.crash_always = False
        self.duplicate_once = False

        self.status = "RUNNING"
        self.current_job_id = None
        self.last_attempts = 0

    def _process(self, job):
        """Process one supplied job using the current worker modes."""

        self.current_job_id = job.id
        self.status = "PROCESSING"

        self.database.update_job_status(
            job.id,
            JobStatus.PROCESSING
        )

        try:
            # Deliberate worker-failure simulation.
            if self.crash_once or self.crash_always:
                if self.crash_once:
                    self.crash_once = False
                raise RuntimeError("Simulated worker crash")

            # Job-level failure simulation.
            if job.body.get("should_fail") is True:
                raise RuntimeError("Simulated job failure")

            # Slow-worker simulation.
            time.sleep(5 if self.slow_mode else 2)

            self.database.update_job_status(
                job.id,
                JobStatus.COMPLETED
            )

        except Exception as error:
            attempts, status = self.database.record_failure(
                job.id,
                self.MAX_ATTEMPTS
            )

            self.last_attempts = attempts

            if status == JobStatus.RETRYING:
                # Preserve the existing NEXUS retry behavior.
                self.database.retry_job(job.id)

        finally:
            self.status = "RUNNING"
            self.current_job_id = None

        return self.database.get_job(job.id)

    def process_next_job(self):
        job = self.database.get_pending_job()

        if job is None:
            print("No pending jobs found.")
            return None

        print(f"Worker picked up job: {job.id}")
        result = self._process(job)
        print(f"Worker finished job: {job.id}")

        # duplicate_once is represented as an explicit operator mode; the
        # underlying idempotency rule remains in JobService/database.
        if self.duplicate_once:
            self.duplicate_once = False

        return result

    def process_job(self, job_id: str):
        """Process a specific pending job from the API."""
        job = self.database.get_job(job_id)

        if job is None:
            return None

        if job.status != JobStatus.PENDING:
            return job

        return self._process(job)

    def set_failure_mode(self, mode: str):
        mode = mode.lower().strip()

        if mode == "worker_crash":
            self.crash_once = True
            return {"mode": mode, "enabled": True}

        if mode == "crash_always":
            self.crash_always = True
            return {"mode": mode, "enabled": True}

        if mode == "slow_worker":
            self.slow_mode = True
            return {"mode": mode, "enabled": True}

        if mode == "duplicate_delivery":
            self.duplicate_once = True
            return {"mode": mode, "enabled": True}

        if mode == "normal":
            self.slow_mode = False
            self.crash_once = False
            self.crash_always = False
            self.duplicate_once = False
            return {"mode": mode, "enabled": False}

        raise ValueError(f"Unknown failure mode: {mode}")

    def restart(self):
        """Reset simulated worker controls and return worker to RUNNING."""
        self.slow_mode = False
        self.crash_once = False
        self.crash_always = False
        self.duplicate_once = False
        self.status = "RUNNING"
        self.current_job_id = None
        return self.get_state()

    def get_state(self):
        if self.crash_always:
            mode = "CRASH_ALWAYS"
        elif self.slow_mode:
            mode = "SLOW"
        elif self.crash_once:
            mode = "CRASH_ONCE"
        elif self.duplicate_once:
            mode = "DUPLICATE_ONCE"
        else:
            mode = "NORMAL"

        return {
            "status": self.status,
            "current_job": self.current_job_id,
            "attempts": self.last_attempts,
            "mode": mode,
        }
