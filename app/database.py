import sqlite3
import json

from datetime import datetime

from app.models import Job, JobStatus


class Database:

    def __init__(self, db_name="nexus.db"):
        self.connection = sqlite3.connect(
            db_name,
            check_same_thread=False
        )

    def create_tables(self):
        cursor = self.connection.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                body TEXT NOT NULL,
                status TEXT NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 0,
                created_at TEXT,
                updated_at TEXT,
                completed_at TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS job_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id TEXT NOT NULL,
                status TEXT NOT NULL,
                attempts INTEGER NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)

        self.connection.commit()

    def save_job(self, job: Job):
        cursor = self.connection.cursor()

        cursor.execute("""
            INSERT INTO jobs (
                id,
                type,
                body,
                status,
                attempts,
                created_at,
                updated_at,
                completed_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            job.id,
            job.type,
            json.dumps(job.body),
            job.status.value,
            job.attempts,
            job.created_at.isoformat() if job.created_at else None,
            job.updated_at.isoformat() if job.updated_at else None,
            job.completed_at.isoformat() if job.completed_at else None
        ))

        self.connection.commit()
        self.add_job_history(
            job.id,
            job.status,
            job.attempts
        )
    def get_job(self, job_id: str):
        cursor = self.connection.cursor()

        cursor.execute("""
            SELECT
                id,
                type,
                body,
                status,
                attempts,
                created_at,
                updated_at,
                completed_at
            FROM jobs
            WHERE id = ?
        """, (job_id,))

        row = cursor.fetchone()

        if row is None:
            return None

        return Job(
            id=row[0],
            type=row[1],
            body=json.loads(row[2]),
            status=JobStatus(row[3]),
            attempts=row[4],
            created_at=datetime.fromisoformat(row[5]) if row[5] else None,
            updated_at=datetime.fromisoformat(row[6]) if row[6] else None,
            completed_at=datetime.fromisoformat(row[7]) if row[7] else None
        )

    def update_job_status(self, job_id: str, status: JobStatus):
        cursor = self.connection.cursor()

        updated_at = datetime.now().isoformat()

        completed_at = None

        if status == JobStatus.COMPLETED:
            completed_at = datetime.now().isoformat()

        cursor.execute("""
            UPDATE jobs
            SET
                status = ?,
                updated_at = ?,
                completed_at = ?
            WHERE id = ?
        """, (
            status.value,
            updated_at,
            completed_at,
            job_id
        ))

        self.connection.commit()
        job = self.get_job(job_id)

        if job:
            self.add_job_history(
                job.id,
                job.status,
                job.attempts
            )

    def get_pending_job(self):
        cursor = self.connection.cursor()

        cursor.execute("""
            SELECT
                id,
                type,
                body,
                status,
                attempts,
                created_at,
                updated_at,
                completed_at
            FROM jobs
            WHERE status = ?
            ORDER BY created_at ASC
            LIMIT 1
        """, (JobStatus.PENDING.value,))

        row = cursor.fetchone()

        if row is None:
            return None

        return Job(
            id=row[0],
            type=row[1],
            body=json.loads(row[2]),
            status=JobStatus(row[3]),
            attempts=row[4],
            created_at=datetime.fromisoformat(row[5]) if row[5] else None,
            updated_at=datetime.fromisoformat(row[6]) if row[6] else None,
            completed_at=datetime.fromisoformat(row[7]) if row[7] else None
        )

    def record_failure(self, job_id: str, max_attempts: int = 3):

        cursor = self.connection.cursor()

        cursor.execute("""
            SELECT attempts
            FROM jobs
            WHERE id = ?
        """, (job_id,))

        row = cursor.fetchone()

        if row is None:
            return None

        attempts = row[0] + 1

        if attempts >= max_attempts:
            status = JobStatus.DEAD_LETTER
        else:
            status = JobStatus.RETRYING

        cursor.execute("""
            UPDATE jobs
            SET
                attempts = ?,
                status = ?,
                updated_at = ?
            WHERE id = ?
        """, (
            attempts,
            status.value,
            datetime.now().isoformat(),
            job_id
        ))

        self.connection.commit()

        self.add_job_history(
            job_id,
            status,
            attempts
        )

        return attempts, status


    def retry_job(self, job_id: str):

        cursor = self.connection.cursor()

        cursor.execute("""
            UPDATE jobs
            SET
                status = ?,
                updated_at = ?
            WHERE id = ?
            AND status = ?
        """, (
            JobStatus.PENDING.value,
            datetime.now().isoformat(),
            job_id,
            JobStatus.RETRYING.value
        ))

        self.connection.commit()

        job = self.get_job(job_id)
        if job:
            self.add_job_history(
                job.id,
                job.status,
                job.attempts
            )

    def add_job_history(
        self,
        job_id: str,
        status: JobStatus,
        attempts: int
    ):

        cursor = self.connection.cursor()

        cursor.execute("""
            INSERT INTO job_history (
                job_id,
                status,
                attempts,
                timestamp
            )
            VALUES (?, ?, ?, ?)
        """, (
            job_id,
            status.value,
            attempts,
            datetime.now().isoformat()
        ))

        self.connection.commit()

    def get_job_history(self, job_id: str):

        cursor = self.connection.cursor()

        cursor.execute("""
            SELECT
                id,
                job_id,
                status,
                attempts,
                timestamp
            FROM job_history
            WHERE job_id = ?
            ORDER BY timestamp ASC
        """, (job_id,))

        return cursor.fetchall()

    def get_all_jobs(self):
        cursor = self.connection.cursor()
        cursor.execute("""
            SELECT
                id,
                type,
                body,
                status,
                attempts,
                created_at,
                updated_at,
                completed_at
            FROM jobs
            ORDER BY created_at DESC
        """)

        rows = cursor.fetchall()

        jobs = []

        for row in rows:
            jobs.append(
                Job(
                    id=row[0],
                    type=row[1],
                    body=json.loads(row[2]),
                    status=JobStatus(row[3]),
                    attempts=row[4],
                    created_at=datetime.fromisoformat(row[5]) if row[5] else None,
                    updated_at=datetime.fromisoformat(row[6]) if row[6] else None,
                    completed_at=datetime.fromisoformat(row[7]) if row[7] else None
                )
            )

        return jobs

    def close(self):
        self.connection.close()