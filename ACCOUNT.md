# NEXUS — Engineering Account

## Project NEXUS Engineering Challenge

**Project:** NEXUS — Fault-Tolerant Job Processing Platform  
**Author:** Himani Joshi

---

## 1. Scope

NEXUS is a small fault-tolerant job-processing platform focused on reliable
background work, worker execution, failure handling, retry behaviour,
persistent job history, and operator visibility.

The implementation consists of four main parts:

### 1.1 Job Processing Platform

The backend accepts jobs and maintains their state throughout the
processing lifecycle.

A successful job follows:

```text
PENDING
   ↓
PROCESSING
   ↓
COMPLETED
```

When processing fails, the job can enter the retry flow:

```text
PROCESSING
   ↓
FAILURE
   ↓
RETRYING
   ↓
PROCESSING
```

Repeatedly failing work eventually reaches:

```text
DEAD_LETTER
```

This gives accepted work a visible outcome instead of allowing failed work
to disappear silently.

### 1.2 Worker

A local worker processes queued jobs.

The worker can be controlled from the operator dashboard.

Current worker controls include:

- Restart Worker
- Slow Mode
- Crash Once
- Trigger Failure

These controls allow failure and recovery behaviour to be demonstrated
directly.

### 1.3 Persistent State and History

SQLite is used as the local persistent data store.

The database maintains job information and job history. History records
state transitions so that an operator can inspect what happened to a
particular job.

For example:

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

### 1.4 Operator View

The frontend provides a browser-based operator dashboard.

The dashboard provides visibility into:

- System health
- Active incidents
- Waiting jobs
- Processing jobs
- Completed jobs
- Retrying jobs
- Dead-letter jobs
- Worker state
- Current worker job
- Attempt count
- Queue health
- Recent activity

It also provides controls for:

- Creating jobs
- Checking job status
- Checking job history
- Processing the next job
- Retrying a job
- Restarting the worker
- Enabling slow mode
- Crashing the worker once
- Triggering failure behaviour

The goal is to allow an operator to understand the current platform state
without inspecting the database directly.

### What Was Deliberately Left Out

The current implementation does not attempt to cover every production
scenario described by the challenge.

The following are outside the current implementation scope:

- Production release management
- Release rollback
- Multi-version deployment
- Cache consistency detection
- Cache freshness enforcement
- External dependency outage management
- Distributed multi-machine deployment
- Production-scale queue infrastructure
- Production authentication and authorization
- Full distributed tracing

These capabilities are not claimed as supported features.

The implementation instead focuses on job processing, worker execution,
failure injection, retry handling, dead-letter handling, job history, and
operator visibility.

---

## 2. Decisions

### 2.1 FastAPI for the Backend

FastAPI was selected for the backend because it provides a lightweight REST
API and automatically exposes interactive Swagger documentation.

This makes the backend easy to inspect and test during development.

Swagger is available at:

```text
http://127.0.0.1:8000/docs
```

The frontend communicates with the backend through HTTP REST APIs.

---

### 2.2 SQLite for Persistence

SQLite was selected because the current implementation is intentionally
small and local.

It provides persistent storage without requiring an external database
server.

The database stores job information and job history so that state is not
represented only in frontend memory.

For a production deployment involving multiple workers or machines, a
shared production database would be more appropriate.

---

### 2.3 Explicit Job States

The platform uses explicit job states instead of treating processing as
only success or failure.

Important states include:

```text
PENDING
PROCESSING
COMPLETED
RETRYING
DEAD_LETTER
```

Explicit states make the lifecycle visible to both the backend and the
operator.

A permanently failing job therefore has a visible final state instead of
remaining in an endless retry loop.

---

### 2.4 Persistent Job History

Job history is maintained separately from the current job state.

The current state answers:

```text
Where is this job now?
```

The history answers:

```text
What happened to this job?
```

This allows the operator to reconstruct the processing sequence and
understand how a job reached its current state.

---

### 2.5 Controlled Failure Injection

Failure behaviour is intentionally triggerable.

The dashboard provides controls such as:

```text
Crash Once
Slow Mode
Trigger Failure
```

This allows failure handling to be demonstrated by actually exercising the
failure path rather than relying only on normal successful processing.

---

### 2.6 Operator Dashboard

The dashboard was designed around operational questions rather than only
raw API output.

The operator should be able to quickly determine:

```text
Is the system healthy?

Is work waiting?

Is something processing?

Is something repeatedly failing?

Is the worker running?

Does an operator need to act?
```

The dashboard therefore combines system health, job counts, queue
information, worker information, recent activity, and operational
controls.

---

### 2.7 What I Would Change

If the platform were expanded beyond the current challenge scope, the
largest architectural changes would be:

1. Replace SQLite with a shared production database.
2. Introduce a durable distributed queue.
3. Separate worker processes from the API process.
4. Add worker heartbeats and leases.
5. Add release and version management.
6. Add structured event and audit records.
7. Add distributed observability.
8. Add authentication and authorization.

The current design was intentionally kept small so the core behaviour could
be implemented, tested, and demonstrated clearly.

---

## 3. Failure Behaviour

Failure handling is a central part of NEXUS.

The implementation provides deliberate worker failure, slow processing,
retry behaviour, worker restart controls, and dead-letter handling.

---

### 3.1 Worker Crash Once

The dashboard provides:

```text
Crash Once
```

This deliberately causes the worker to fail once.

The purpose is to verify that a worker failure can be observed and that the
affected work remains visible to the platform.

The reviewer can trigger this directly from the dashboard.

---

### 3.2 Slow Worker

The dashboard provides:

```text
Slow Mode
```

This deliberately slows worker processing.

The purpose is to make degraded processing observable and allow the
operator to inspect queue and worker behaviour while processing is slower
than normal.

---

### 3.3 Trigger Failure

The dashboard provides:

```text
Trigger Failure
```

This is the deliberate failure-injection mechanism.

The available failure modes can be selected through this operation.

The purpose is to allow a reviewer to intentionally break worker
processing and observe the resulting platform behaviour.

---

### 3.4 Retry Behaviour

When processing fails and the job is eligible for another attempt, the job
enters the retry flow.

The expected sequence is:

```text
PROCESSING
     ↓
FAILURE
     ↓
RETRYING
     ↓
PROCESSING
```

The resulting state can be checked using:

```text
Job Status
```

The sequence of events can be inspected using:

```text
Job History
```

---

### 3.5 Retry Limit and Dead Letter

Retries are not intended to continue forever.

After repeated failure, the job reaches:

```text
DEAD_LETTER
```

This prevents a permanently failing job from remaining in an endless retry
loop.

The dead-letter state is visible on the operator dashboard and remains
available for investigation through job history.

---

### 3.6 Dead-Letter Flow

A complete failure sequence can look like:

```text
PENDING
   ↓
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
PROCESSING
   ↓
FAILURE
   ↓
DEAD_LETTER
```

The exact number of attempts depends on the configured retry behaviour.

The important property is that repeatedly failing work eventually reaches
a controlled and visible terminal state.

---

### 3.7 Retry a Job

The dashboard provides:

```text
Retry Job
```

for retryable work.

After requesting a retry, the operator can inspect:

```text
Job Status
```

and:

```text
Job History
```

to determine the resulting state and processing sequence.

---

### 3.8 Restart Worker

The Worker section provides:

```text
Restart Worker
```

to exercise worker restart behaviour.

This provides an operator-facing way to control the worker rather than
requiring every worker action to be performed manually from the terminal.

---

### 3.9 How a Reviewer Can Break the System

A reviewer can exercise the supported failure behaviour as follows.

#### Worker Failure

1. Open the dashboard.
2. Select `Crash Once`.
3. Process a job.
4. Observe the worker and job state.
5. Inspect recent activity and job history.

#### Slow Processing

1. Enable `Slow Mode`.
2. Create or process a job.
3. Observe the worker and queue state.

#### Repeated Failure

1. Use `Trigger Failure`.
2. Process a test job.
3. Allow the failure and retry sequence to continue.
4. Observe the job move through retry states.
5. Verify that it eventually reaches `DEAD_LETTER`.

#### Retry

1. Identify a retryable job.
2. Select `Retry Job`.
3. Process the job again.
4. Check its status and history.

The important result is that failure remains visible and leaves a recorded
state instead of silently disappearing.

---

## 4. Limits

The current implementation has several deliberate boundaries.

### 4.1 Local Deployment

The system is designed to run locally.

The current setup uses:

```text
FastAPI
SQLite
Local Worker
Browser Frontend
```

It has not been designed as a multi-machine production deployment.

---

### 4.2 SQLite Concurrency

SQLite is appropriate for this challenge-scale implementation, but it is
not intended to replace a production distributed database.

Heavy concurrent worker activity would require a different persistence
architecture.

---

### 4.3 Single Local Worker

The current worker model is local and intentionally simple.

The implementation does not claim to provide the coordination guarantees
of a large distributed worker fleet.

A production implementation would require worker identity, leases,
heartbeats, ownership rules, and stronger concurrency controls.

---

### 4.4 Failure Coverage

The current implementation does not cover every failure scenario in the
challenge.

The following are not currently implemented:

- Release rollback
- Release/version correlation
- Cache disagreement detection
- Cache age enforcement
- External dependency degradation

These should therefore not be interpreted as supported NEXUS features.

---

### 4.5 Production Security

The current local challenge implementation does not provide a complete
production authentication and authorization layer.

The API is intended for local evaluation.

It should not be exposed directly to an untrusted network without adding
appropriate security controls.

---

### 4.6 Recovery Guarantees

The retry and dead-letter flow has been implemented and exercised locally.

However, the current project should not be interpreted as providing every
possible distributed durability guarantee of a production job-processing
system.

Scenarios involving simultaneous machine failure, network partitions,
multiple independent workers, or distributed database failure require a
production architecture outside the current implementation.

---

## 5. Confidence

Confidence is divided between behaviour that was directly tested and areas
that are currently outside the tested scope.

---

### 5.1 Directly Tested

The following behaviours were exercised during development.

#### Backend

- FastAPI startup
- Swagger API
- Job creation
- Job processing
- Job status retrieval
- Job history retrieval
- Dashboard endpoint
- Retry flow
- Worker-related operations

#### Database

- Job storage
- Job history storage
- State transitions
- Reading recorded job history

#### Frontend

- Dashboard loading
- Backend connection
- Dashboard health state
- Work overview
- Worker information
- Queue information
- Recent activity
- Create Job
- Job Status
- Job History
- Process Next
- Retry Job
- Trigger Failure
- Restart Worker
- Slow Mode
- Crash Once

#### Failure Testing

The failure path was deliberately exercised until a test job reached:

```text
DEAD_LETTER
```

This confirmed that the implemented failure flow can produce a visible
dead-letter state.

---

### 5.2 Backend Testing Through Swagger

The backend operations were tested directly through FastAPI's Swagger
interface.

This helped separate backend behaviour from frontend integration issues.

The frontend was then connected to the same backend operations.

---

### 5.3 What Was Not Tested

The following production-scale scenarios were not tested because they are
outside the current implementation:

- Multi-machine worker failure
- Distributed database failure
- Network partitions
- Production-scale concurrent processing
- Release rollback
- Cache consistency
- External dependency outages

These are treated as limitations rather than claims.

---

### 5.4 Assumptions

The implementation assumes:

- The backend and frontend are running locally.
- The local SQLite database is available.
- The worker is available when processing is requested.
- The operator has access to the dashboard.
- The reviewer follows the provided setup instructions.

The project does not depend on external cloud infrastructure.

---

## 6. Next

If another six hours were available, I would work on the following in
priority order.

### 6.1 Harden Job Durability

The first priority would be strengthening the guarantee that accepted work
survives worker and application restarts.

This would include:

- Durable job ownership
- Worker leases
- Recovery of interrupted processing
- Explicit acknowledgement
- Better handling of jobs interrupted during processing

---

### 6.2 Improve Worker Lifecycle

The worker would be moved toward a more explicit lifecycle model:

```text
STARTING
RUNNING
DEGRADED
RESTARTING
STOPPED
FAILED
```

Worker heartbeats would make it possible to distinguish an idle worker
from a worker that has actually stopped responding.

---

### 6.3 Improve Operator Incident View

The dashboard would be extended so that an operator could immediately
answer:

```text
What is wrong?
When did it start?
What changed?
What job or component is affected?
What should I do next?
```

The current dashboard already provides health, queue, worker, and recent
activity information.

The next step would be connecting these into a clearer incident timeline
and recommended operator action.

---

### 6.4 Add Release Management

Release/version handling is not currently implemented.

A future version would add:

- Release identifiers
- Deployment records
- Version state
- Rollback action
- Release-to-behaviour correlation

This would address release-related requirements that are currently outside
the implementation scope.

---

### 6.5 Add Consistency Checks

A future version would support comparing duplicated values and reporting
disagreements.

The system would need to track:

- Value
- Source
- Timestamp
- Age
- Expected owner
- Resolution status

This would make cache/data disagreement a first-class operator-visible
failure.

---

### 6.6 Move Toward Production Architecture

After the core behaviour is hardened, the next architectural step would be
toward:

- Shared production database
- Durable distributed queue
- Multiple workers
- Worker leases
- Authentication
- Structured logging
- Metrics
- Distributed tracing
- Deployment automation

The goal would be to preserve the current operator-visible behaviour while
replacing local components with production-grade infrastructure.

---

# Final Assessment

NEXUS currently demonstrates a focused subset of the larger platform
described by the engineering challenge.

The strongest implemented areas are:

```text
Job Processing
      ↓
Worker Execution
      ↓
Failure Injection
      ↓
Retry Handling
      ↓
Dead-Letter Handling
      ↓
Persistent Job History
      ↓
Operator Dashboard
```

The implementation intentionally does not claim capabilities that have not
been built or tested.

NEXUS should therefore be understood as a small, demonstrable
fault-tolerant job-processing platform with an operator control surface,
rather than a complete production infrastructure platform.

The current implementation prioritizes clear failure behaviour,
recoverability, persistent state, and operator visibility.