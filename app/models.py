from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any


class JobStatus(Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    RETRYING = "RETRYING"
    FAILED = "FAILED"
    DEAD_LETTER = "DEAD_LETTER"


@dataclass
class Job:
    id: str
    type: str
    body: dict[str, Any]

    status: JobStatus = JobStatus.PENDING
    attempts: int = 0

    created_at: datetime | None = None
    updated_at: datetime | None = None
    completed_at: datetime | None = None