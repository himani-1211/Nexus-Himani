from models import Job


job = Job(
    id="job-001",
    type="email",
    body={
        "recipient": "user@example.com",
        "message": "Your order has shipped"
    }
)

print(job)