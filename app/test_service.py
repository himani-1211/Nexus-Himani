from app.database import Database
from app.services import JobService


db = Database()
db.create_tables()

service = JobService(db)


# First submission
first_job, first_created = service.accept_job(
    job_id="test-duplicate-001",
    job_type="email",
    body={
        "recipient": "user@example.com",
        "message": "First request"
    }
)

print("FIRST REQUEST")
print("Created:", first_created)
print("Job ID:", first_job.id)


# Second submission with the SAME job ID
second_job, second_created = service.accept_job(
    job_id="test-duplicate-001",
    job_type="email",
    body={
        "recipient": "different@example.com",
        "message": "Second request"
    }
)

print("\nSECOND REQUEST")
print("Created:", second_created)
print("Job ID:", second_job.id)


db.close()