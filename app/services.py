from datetime import datetime

from app.database import Database
from app.models import Job, JobStatus


class JobService:

    def __init__(self, database: Database):
        self.database = database

    def accept_job(self, job_id: str, job_type: str, body: dict):

        existing_job = self.database.get_job(job_id)

        if existing_job is not None:
            return existing_job, False

        now = datetime.now()

        job = Job(
            id=job_id,
            type=job_type,
            body=body,
            created_at=now,
            updated_at=now
        )

        self.database.save_job(job)

        return job, True

    def start_job(self, job_id: str):

        job = self.database.get_job(job_id)

        if job is None:
            return None

        if job.status != JobStatus.PENDING:
            return job

        self.database.update_job_status(
            job_id,
            JobStatus.PROCESSING
        )

        return self.database.get_job(job_id)

    def complete_job(self, job_id: str):

        job = self.database.get_job(job_id)

        if job is None:
            return None

        if job.status != JobStatus.PROCESSING:
            return job

        self.database.update_job_status(
            job_id,
            JobStatus.COMPLETED
        )

        return self.database.get_job(job_id)