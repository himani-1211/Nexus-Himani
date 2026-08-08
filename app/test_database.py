from datetime import datetime

from app.database import Database
from app.models import Job


# First connection
db = Database()
db.create_tables()

job = Job(
    id="job-002",
    type="email",
    body={
        "recipient": "user@example.com",
        "message": "Your order has shipped"
    },
    created_at=datetime.now(),
    updated_at=datetime.now()
)

db.save_job(job)

print("Job saved successfully.")

# Simulate NEXUS shutting down
db.close()

print("Database connection closed.")

# Simulate NEXUS starting again
db = Database()

# Retrieve previously saved job
saved_job = db.get_job("job-002")

print("\nRecovered job:")
print(saved_job)

db.close()