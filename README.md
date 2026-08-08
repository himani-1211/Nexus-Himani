# NEXUS — Fault-Tolerant Job Processing Platform

NEXUS is a fault-tolerant job processing platform built for the
Project NEXUS Engineering Challenge.

It accepts background work, places it into a queue, hands it to a worker,
tracks its state, retries failed work, moves repeatedly failing jobs to a
dead-letter state, records job history, and provides an operator dashboard
for monitoring and control.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Installation](#installation)
- [Start the Backend](#start-the-backend)
- [Start the Frontend](#start-the-frontend)
- [Operator Dashboard](#operator-dashboard)
- [Normal Job Flow](#normal-job-flow)
- [Failure and Recovery Testing](#failure-and-recovery-testing)
- [Supported Failure Scenarios](#supported-failure-scenarios)
- [API Overview](#api-overview)
- [Database and Job History](#database-and-job-history)
- [Testing Checklist](#testing-checklist)
- [Scope](#scope)
- [Known Limitations](#known-limitations)
- [Technology Stack](#technology-stack)

---

# Overview

NEXUS provides a small local platform for processing background jobs while
making failures and recovery behaviour visible to an operator.

The system consists of:

1. A FastAPI backend
2. A job-processing worker
3. A SQLite database
4. A browser-based operator dashboard
5. Failure-injection and worker-control operations

The platform is intentionally small and focuses on demonstrating reliable
job processing, controlled failure, retry behaviour, worker control, and
operational visibility.

---

# Key Features

## Job Processing

- Create new jobs
- Queue jobs for processing
- Process queued jobs
- Track job status
- Track processing attempts
- Store timestamps
- Record state transitions

## Failure Handling

- Deliberately trigger worker failures
- Simulate slow worker behaviour
- Retry failed jobs
- Handle repeated failures
- Move permanently failing jobs to `DEAD_LETTER`
- Preserve job history

## Worker Controls

The operator dashboard provides controls for:

- Restarting the worker
- Enabling slow mode
- Crashing the worker once
- Triggering failure behaviour

## Operator Dashboard

The dashboard displays:

- Current system health
- Active incidents
- Waiting jobs
- Processing jobs
- Completed jobs
- Retrying jobs
- Dead-letter jobs
- Worker state
- Current job
- Attempt count
- Queue health
- Recent activity

The dashboard also provides controls to interact with the backend.

---

# Architecture

```text
                         NEXUS
                           │
                           ▼
                ┌─────────────────────┐
                │  Operator Dashboard │
                │    HTML / CSS / JS  │
                └──────────┬──────────┘
                           │
                        HTTP REST
                           │
                           ▼
                ┌─────────────────────┐
                │       FastAPI       │
                │       Backend       │
                └──────────┬──────────┘
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
       ┌──────────┐  ┌──────────┐  ┌──────────┐
       │  Job     │  │ SQLite   │  │  Worker  │
       │ Services │  │ Database │  │          │
       └──────────┘  └──────────┘  └──────────┘
             │             │             │
             └─────────────┼─────────────┘
                           │
                           ▼
                  Job State & History
```

---

# Job Lifecycle

A normal job follows this general flow:

```text
PENDING
   │
   ▼
PROCESSING
   │
   ▼
COMPLETED
```

When a job fails, the platform can retry it:

```text
PENDING
   │
   ▼
PROCESSING
   │
   ▼
FAILURE
   │
   ▼
RETRYING
   │
   ▼
PROCESSING
   │
   ├──────────────► COMPLETED
   │
   └──────────────► FAILURE
                         │
                         ▼
                    DEAD_LETTER
```

`DEAD_LETTER` represents a job that has exhausted the available retry
attempts and has been given up on in a controlled and visible way.

---

# Project Structure

```text
Nexus-Himani/
│
├── app/
│   ├── __init__.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── services.py
│   ├── worker.py
│   ├── test_database.py
│   ├── test_model.py
│   └── test_service.py
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── nexus.db
├── .gitignore
├── README.md
└── ACCOUNT.md
```

> The exact files may change as the implementation evolves. The important
> components are the FastAPI backend, worker, database, frontend, and
> tests.

---

# Requirements

Before running the project, install:

- Python 3.10 or newer
- pip
- A modern web browser
- VS Code is recommended for local development

---

# Installation

Open a terminal in the project directory:

```bash
cd nexus-core
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```powershell
venv\Scripts\activate
```

Install the required packages:

```bash
pip install fastapi uvicorn
```

If the project environment contains additional dependencies, install them
before starting the backend.

---

# Start the Backend

From the project root, run:

```bash
uvicorn app.main:app --reload
```

The backend should start at:

```text
http://127.0.0.1:8000
```

A successful startup should show Uvicorn running without application
startup errors.

---

# Swagger API Documentation

FastAPI automatically provides Swagger UI.

Open:

```text
http://127.0.0.1:8000/docs
```

Swagger can be used to inspect and directly test the backend endpoints.

The dashboard uses the same backend APIs.

---

# Start the Frontend

The frontend is located inside:

```text
frontend/
```

Open:

```text
frontend/index.html
```

using a local development server.

For example, using VS Code Live Server:

```text
frontend/index.html
```

The dashboard will normally be available at:

```text
http://127.0.0.1:5500/frontend/index.html
```

The frontend communicates with:

```text
http://127.0.0.1:8000
```

for backend operations.

---

# Operator Dashboard

The NEXUS Operator Dashboard is the main interface for observing and
controlling the platform.

## System Health

The dashboard reports the current health of the platform.

Examples include:

```text
System Operational
```

or an operator attention state when an abnormal condition is detected.

---

## Operator Actions

The dashboard provides the following controls:

### Create Job

Creates and submits a new piece of work.

### Job Status

Retrieves the current state of a specific job.

### Job History

Displays the recorded state transitions of a job.

### Process Next

Processes the next available queued job.

### Retry Job

Requests another attempt for a retryable job.

### Trigger Failure

Deliberately exercises a failure mode for testing.

---

# Worker Controls

The worker section provides controls for deliberately exercising worker
behaviour.

## Restart

Restarts the worker.

## Slow Mode

Makes the worker process work more slowly so that the operator can observe
the platform under degraded processing speed.

## Crash Once

Deliberately causes a worker failure once.

These controls are provided specifically so that failure and recovery
behaviour can be demonstrated.

---

# Normal Job Flow

The following is the recommended first test.

## Step 1 — Create a Job

Open the dashboard and select:

```text
Create Job
```

Example:

```text
Job ID:
demo-job-001

Job Type:
demo

Job Body:
{"message":"Hello NEXUS"}
```

Submit the job.

The job should enter the queue.

---

## Step 2 — Process the Job

Select:

```text
Process Next
```

The worker should pick up the queued job.

The job should eventually reach:

```text
COMPLETED
```

---

## Step 3 — Check Job Status

Select:

```text
Job Status
```

Enter:

```text
demo-job-001
```

The dashboard should display the current state of the job.

---

## Step 4 — Check Job History

Select:

```text
Job History
```

Enter:

```text
demo-job-001
```

The history should show the recorded state transitions.

---

# Failure and Recovery Testing

NEXUS includes deliberate failure controls so that the supported failure
behaviour can be tested on demand.

The recommended failure tests are described below.

---

## Test 1 — Crash Worker Once

### Trigger

Use:

```text
Crash Once
```

Then process a job.

### Expected behaviour

The worker deliberately fails once.

The platform should remain aware of the affected work and the resulting
worker/job state should be visible through the dashboard and history.

---

# Test 2 — Slow Worker

### Trigger

Use:

```text
Slow Mode
```

Then process a job.

### Expected behaviour

The worker processes work more slowly.

The dashboard can be used to observe the worker and queue state while the
job is being processed.

---

# Test 3 — Trigger Failure

### Trigger

Use:

```text
Trigger Failure
```

Select one of the failure modes exposed by the frontend/backend.

### Expected behaviour

The selected failure behaviour should occur and the resulting job and
worker state should be visible through the dashboard.

---

# Test 4 — Retry Behaviour

Create or identify a retryable failed job.

Use:

```text
Retry Job
```

with the appropriate Job ID.

Then observe:

```text
Job Status
```

and:

```text
Job History
```

The job should return to the appropriate retry/processing flow.

---

# Test 5 — Dead-Letter Behaviour

Trigger a failure that repeatedly fails.

The expected lifecycle is:

```text
PROCESSING
     ↓
FAILURE
     ↓
RETRYING
     ↓
PROCESSING
     ↓
FAILURE
     ↓
RETRYING
     ↓
...
     ↓
DEAD_LETTER
```

When the retry limit is reached, the job should become:

```text
DEAD_LETTER
```

The dashboard should show that the job requires operator attention.

The job history should preserve the sequence of events.

---

# Supported Failure Scenarios

The NEXUS Engineering Challenge provides a set of failure scenarios that
reviewers may attempt.

The current implementation focuses on the following:

| Failure Scenario | Status | How to Test |
|---|---|---|
| Worker failure | Supported | Crash Once / Trigger Failure |
| Slow worker | Supported | Slow Mode |
| Repeated job failure | Supported | Trigger Failure |
| Retry behaviour | Supported | Retry Job / failure flow |
| Dead-letter handling | Supported | Repeated failure |
| Duplicate delivery | Failure mode implemented if enabled | Trigger Failure |
| Worker restart | Supported | Restart |
| Bad release rollback | Not implemented | Not claimed |
| Cache disagreement | Not implemented | Not claimed |
| Dependency outage | Not implemented | Not claimed |

The implementation intentionally does not claim to support failure modes
that have not been implemented and tested.

---

# API Overview

The FastAPI backend provides REST endpoints for the main NEXUS operations.

Core operations include:

```text
POST /jobs
GET  /jobs/{job_id}
GET  /jobs/{job_id}/history

POST /worker/process

POST /jobs/{job_id}/retry

GET  /dashboard
```

Worker-control and failure-injection endpoints are also exposed by the
backend.

The authoritative list of available endpoints can be viewed in Swagger:

```text
http://127.0.0.1:8000/docs
```

---

# Database and Job History

NEXUS uses SQLite for persistent job and history information.

The database contains job records and historical state transitions.

Job history allows an operator to reconstruct what happened to a piece of
work.

For example, a job can produce a history similar to:

```text
PENDING
PROCESSING
COMPLETED
```

or:

```text
PENDING
PROCESSING
RETRYING
PROCESSING
DEAD_LETTER
```

The dashboard exposes this history through the:

```text
Job History
```

operation.

---

# Recent Activity

The dashboard provides a recent activity section showing recent jobs and
their states.

Information includes:

- Job ID
- Status
- Attempts
- Timestamp

This gives the operator a quick view of recent platform behaviour without
having to inspect the database directly.

---

# Queue Health

The dashboard exposes queue information including:

- Waiting jobs
- Oldest waiting job
- Waiting duration

This helps identify work that is waiting too long to be processed.

---

# Worker State

The dashboard shows the current worker state.

It includes information such as:

- Worker status
- Current job
- Number of attempts
- Worker control state

This is intended to make worker failures and degraded states visible to
the operator.

---

# Testing Checklist

Before submitting the repository, verify the following.

## Backend

- [ ] FastAPI starts successfully
- [ ] Swagger UI opens
- [ ] `/dashboard` works
- [ ] Job creation works
- [ ] Job status works
- [ ] Job history works
- [ ] Job processing works
- [ ] Retry operation works

## Frontend

- [ ] Dashboard loads
- [ ] Backend connection works
- [ ] System health is displayed
- [ ] Create Job works
- [ ] Job Status works
- [ ] Job History works
- [ ] Process Next works
- [ ] Retry Job works
- [ ] Trigger Failure works
- [ ] Restart works
- [ ] Slow Mode works
- [ ] Crash Once works

## Failure Behaviour

- [ ] Worker failure can be triggered
- [ ] Slow worker behaviour can be triggered
- [ ] Failed work is visible
- [ ] Retry behaviour is visible
- [ ] Repeated failures reach `DEAD_LETTER`
- [ ] Dead-letter jobs are visible on the dashboard
- [ ] Job history records the failure sequence

---

# Scope

NEXUS is intentionally a small engineering challenge implementation.

The current scope focuses on:

- Job submission
- Job processing
- Worker execution
- Worker controls
- Failure injection
- Retry handling
- Dead-letter handling
- Persistent job history
- Queue visibility
- Operator dashboard

The project does not attempt to implement a complete production-grade
distributed job-processing infrastructure.

---

# Known Limitations

The current implementation is designed for local demonstration and
evaluation.

It uses:

- Local FastAPI
- SQLite
- A local worker
- A browser-based frontend

It is not intended to represent a production deployment with multiple
machines or production-grade infrastructure.

The implementation also does not currently claim support for every failure
scenario described in the challenge.

In particular:

- Release rollback is not implemented.
- Cache disagreement detection is not implemented.
- Dependency outage handling is not implemented.

These scenarios are intentionally not presented as supported features.

---

# Technology Stack

## Backend

- Python
- FastAPI
- Uvicorn
- SQLite

## Frontend

- HTML
- CSS
- JavaScript

## Testing / Development

- VS Code
- FastAPI Swagger UI
- Local browser testing

---

# Repository Contents

The repository contains:

```text
Backend
    FastAPI application
    Database layer
    Job models
    Job services
    Worker

Frontend
    Operator dashboard
    Dashboard styling
    Backend API integration

Database
    SQLite job data and history

Documentation
    README.md
    ACCOUNT.md
```

---

# Submission

This repository is the NEXUS Engineering Challenge submission.

The repository is intended to allow a reviewer to:

1. Start the backend.
2. Open the operator dashboard.
3. Submit work.
4. Observe job processing.
5. Inspect job history.
6. Trigger supported failures.
7. Observe retry behaviour.
8. Observe dead-letter behaviour.
9. Inspect worker and queue health.

The project is intentionally explicit about its supported and unsupported
failure scenarios.

---

# Author

**Himani Joshi**

Project:

**NEXUS — Fault-Tolerant Job Processing Platform**

Built for the **Project NEXUS Engineering Challenge**.