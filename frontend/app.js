/* =========================================================
   NEXUS — FRONTEND APPLICATION
   Complete Frontend ↔ FastAPI Integration
========================================================= */


/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE = "http://127.0.0.1:8000";


const ENDPOINTS = {

    // Dashboard
    dashboard: "/dashboard",

    // Jobs
    createJob: "/jobs",
    jobStatus: "/jobs/:job_id",
    jobHistory: "/jobs/:job_id/history",

    // Worker
    processNext: "/worker/process",

    // Recovery
    retryJob: "/jobs/:job_id/retry",

    // Failure / Worker Controls
    triggerFailure: "/worker/failure-mode",
    restartWorker: "/worker/restart",
    workerSlow: "/worker/slow",
    workerCrash: "/worker/crash"
};


/* =========================================================
   DOM HELPER
========================================================= */

function $(id) {

    return document.getElementById(id);

}


/* =========================================================
   GLOBAL STATE
========================================================= */

let activeAction = null;


/* =========================================================
   API REQUEST
========================================================= */

async function apiRequest(path, options = {}) {

    if (!path) {

        throw new Error(
            "Backend endpoint is not configured."
        );

    }


    const response = await fetch(
        `${API_BASE}${path}`,
        {
            headers: {

                "Content-Type":
                    "application/json",

                ...(options.headers || {})
            },

            ...options
        }
    );


    const text =
        await response.text();


    let data = null;


    try {

        data =
            text
                ? JSON.parse(text)
                : null;

    }

    catch {

        data =
            text;

    }


    if (!response.ok) {

        let message =
            `Request failed (${response.status})`;


        if (
            data &&
            typeof data === "object" &&
            data.detail
        ) {

            if (
                Array.isArray(data.detail)
            ) {

                message =
                    data.detail
                        .map(
                            item =>
                                item.msg ||
                                JSON.stringify(item)
                        )
                        .join(", ");

            }

            else {

                message =
                    String(
                        data.detail
                    );

            }

        }


        throw new Error(
            message
        );

    }


    return data;

}


/* =========================================================
   DIRECT JOB OPERATIONS
========================================================= */

async function startJob(jobId) {

    if (!jobId) {

        throw new Error(
            "Job ID is required."
        );

    }


    return apiRequest(
        `/jobs/${encodeURIComponent(jobId)}/start`,
        {
            method: "POST"
        }
    );

}


async function completeJob(jobId) {

    if (!jobId) {

        throw new Error(
            "Job ID is required."
        );

    }


    return apiRequest(
        `/jobs/${encodeURIComponent(jobId)}/complete`,
        {
            method: "POST"
        }
    );

}


async function processJob(jobId) {

    if (!jobId) {

        throw new Error(
            "Job ID is required."
        );

    }


    return apiRequest(
        `/jobs/${encodeURIComponent(jobId)}/process`,
        {
            method: "POST"
        }
    );

}


/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {

    try {

        const data =
            await apiRequest(
                ENDPOINTS.dashboard
            );


        updateCounts(
            data?.counts || {}
        );


        updateQueue(
            data?.queue || {}
        );


        updateActivity(
            data?.recent_activity || []
        );


        updateAlert(
            data?.counts || {}
        );


        updateWorker(
            data?.worker ||
            data?.worker_state ||
            {}
        );


        updateSystemStatus(
            true
        );


        if ($("last-refresh")) {

            $("last-refresh").textContent =
                `Updated ${new Date().toLocaleTimeString()}`;

        }

    }

    catch (error) {

        console.error(
            "Dashboard error:",
            error
        );


        updateSystemStatus(
            false
        );


        showToast(
            "Dashboard Offline",
            error.message,
            "!"
        );

    }

}


/* =========================================================
   UPDATE COUNTS
========================================================= */

function updateCounts(counts) {

    if ($("waiting-count")) {

        $("waiting-count").textContent =
            counts.PENDING ?? 0;

    }


    if ($("processing-count")) {

        $("processing-count").textContent =
            counts.PROCESSING ?? 0;

    }


    if ($("completed-count")) {

        $("completed-count").textContent =
            counts.COMPLETED ?? 0;

    }


    if ($("retrying-count")) {

        $("retrying-count").textContent =
            counts.RETRYING ?? 0;

    }


    if ($("dead-letter-count")) {

        $("dead-letter-count").textContent =
            counts.DEAD_LETTER ?? 0;

    }

}


/* =========================================================
   SYSTEM STATUS
========================================================= */

function updateSystemStatus(
    isHealthy
) {

    const root =
        $("system-status");


    const text =
        $("system-status-text");


    if (!root || !text) {

        return;

    }


    root.classList.toggle(
        "offline",
        !isHealthy
    );


    const dot =
        root.querySelector(
            ".status-dot"
        );


    if (dot) {

        dot.classList.toggle(
            "offline",
            !isHealthy
        );

    }


    text.textContent =
        isHealthy
            ? "System Operational"
            : "Dashboard Offline";

}


/* =========================================================
   ALERT / INCIDENT
========================================================= */

function updateAlert(
    counts
) {

    const card =
        $("alert-card");


    const title =
        $("alert-title");


    const message =
        $("alert-message");


    const icon =
        $("alert-icon");


    const state =
        $("alert-state");


    if (
        !card ||
        !title ||
        !message ||
        !icon
    ) {

        return;

    }


    card.classList.remove(
        "warning",
        "danger"
    );


    /* DEAD LETTER */

    if (
        (counts.DEAD_LETTER ?? 0) > 0
    ) {

        card.classList.add(
            "danger"
        );


        title.textContent =
            "Dead-letter jobs detected";


        message.textContent =
            `${counts.DEAD_LETTER} job(s) require operator attention.`;


        icon.textContent =
            "!";


        if (state) {

            state.textContent =
                "ACTION REQUIRED";

        }


        return;

    }


    /* RETRYING */

    if (
        (counts.RETRYING ?? 0) > 0
    ) {

        card.classList.add(
            "warning"
        );


        title.textContent =
            "Jobs are being retried";


        message.textContent =
            `${counts.RETRYING} job(s) are currently retrying.`;


        icon.textContent =
            "!";


        if (state) {

            state.textContent =
                "RECOVERY";

        }


        return;

    }


    /* PENDING */

    if (
        (counts.PENDING ?? 0) > 0
    ) {

        card.classList.add(
            "warning"
        );


        title.textContent =
            "Jobs waiting in queue";


        message.textContent =
            `${counts.PENDING} job(s) are waiting to be processed.`;


        icon.textContent =
            "!";


        if (state) {

            state.textContent =
                "QUEUE ACTIVE";

        }


        return;

    }


    /* HEALTHY */

    title.textContent =
        "No active incidents";


    message.textContent =
        "NEXUS is currently processing work normally.";


    icon.textContent =
        "✓";


    if (state) {

        state.textContent =
            "HEALTHY";

    }

}


/* =========================================================
   WORKER STATUS
========================================================= */

function updateWorker(
    worker
) {

    if (
        !worker ||
        Object.keys(worker).length === 0
    ) {

        return;

    }


    const status =
        worker.status ||
        worker.state ||
        worker.worker_status;


    const currentJob =
        worker.current_job ??
        worker.currentJob ??
        worker.job_id;


    const attempts =
        worker.attempts;


    const mode =
        worker.mode;


    if (status) {

        if ($("worker-status")) {

            $("worker-status").textContent =
                String(status);

        }


        if ($("worker-badge")) {

            $("worker-badge").textContent =
                String(status).toUpperCase();

        }


        if ($("worker-dot")) {

            const normalized =
                String(
                    status
                ).toLowerCase();


            $("worker-dot")
                .classList
                .toggle(
                    "worker-danger",
                    [
                        "failed",
                        "crashed",
                        "dead",
                        "stopped"
                    ].includes(
                        normalized
                    )
                );

        }

    }


    if (
        currentJob !== undefined &&
        $("current-job")
    ) {

        $("current-job").textContent =
            currentJob || "None";

    }


    if (
        attempts !== undefined &&
        $("worker-attempts")
    ) {

        $("worker-attempts").textContent =
            attempts;

    }


    if (
        mode &&
        $("worker-mode")
    ) {

        $("worker-mode").textContent =
            String(mode);

    }

}


/* =========================================================
   QUEUE
========================================================= */

function updateQueue(
    queue
) {

    if (!queue) {

        return;

    }


    if ($("oldest-job")) {

        $("oldest-job").textContent =
            queue.oldest_job || "None";

    }


    if ($("waiting-since")) {

        $("waiting-since").textContent =
            queue.waiting_since
                ? formatTime(
                    queue.waiting_since
                )
                : "—";

    }

}


/* =========================================================
   RECENT ACTIVITY
========================================================= */

function updateActivity(
    activity
) {

    const table =
        $("activity-table");


    if (!table) {

        return;

    }


    if (
        !Array.isArray(activity) ||
        activity.length === 0
    ) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="4"
                    class="empty-cell"
                >
                    No activity yet
                </td>
            </tr>
        `;


        return;

    }


    table.innerHTML =
        "";


    activity.forEach(
        event => {

            const row =
                document.createElement(
                    "tr"
                );


            const values = [

                event.job_id ??
                    "—",

                event.status ??
                    "—",

                event.attempts ??
                    0,

                formatTime(
                    event.timestamp
                )

            ];


            values.forEach(
                (
                    value,
                    index
                ) => {

                    const cell =
                        document.createElement(
                            "td"
                        );


                    if (
                        index === 1
                    ) {

                        const badge =
                            document.createElement(
                                "span"
                            );


                        badge.className =
                            `status-badge ${statusClass(value)}`;


                        badge.textContent =
                            value;


                        cell.appendChild(
                            badge
                        );

                    }

                    else {

                        cell.textContent =
                            value;

                    }


                    row.appendChild(
                        cell
                    );

                }
            );


            table.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   STATUS CLASS
========================================================= */

function statusClass(
    status
) {

    const value =
        String(
            status || ""
        ).toLowerCase();


    if (
        value.includes(
            "complete"
        )
    ) {

        return "complete";

    }


    if (
        value.includes(
            "retry"
        )
    ) {

        return "retry";

    }


    if (
        value.includes(
            "dead"
        )
    ) {

        return "dead";

    }


    if (
        value.includes(
            "process"
        )
    ) {

        return "processing";

    }


    if (
        value.includes(
            "pending"
        )
    ) {

        return "pending";

    }


    if (
        value.includes(
            "fail"
        )
    ) {

        return "dead";

    }


    return "neutral";

}


/* =========================================================
   TIME FORMAT
========================================================= */

function formatTime(
    timestamp
) {

    if (!timestamp) {

        return "—";

    }


    const date =
        new Date(
            timestamp
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            timestamp
        );

    }


    return date.toLocaleString();

}


/* =========================================================
   API RESULT FORMATTER
========================================================= */

function formatApiResult(
    data
) {

    if (
        data === null ||
        data === undefined
    ) {

        return "NEXUS accepted the request.";

    }


    if (
        typeof data === "string"
    ) {

        return data;

    }


    if (
        data.message &&
        !data.job
    ) {

        return String(
            data.message
        );

    }


    if (data.job) {

        const job =
            data.job;


        const parts = [];


        if (job.id) {

            parts.push(
                `Job: ${job.id}`
            );

        }


        if (job.status) {

            parts.push(
                `Status: ${job.status}`
            );

        }


        if (
            job.attempts !==
            undefined
        ) {

            parts.push(
                `Attempts: ${job.attempts}`
            );

        }


        return parts.length
            ? parts.join(" · ")
            : "Job operation completed.";

    }


    if (
        Array.isArray(
            data.history
        )
    ) {

        return (
            `History loaded: ` +
            `${data.history.length} event(s).`
        );

    }


    if (data.mode) {

        return (
            `Mode: ${data.mode}` +
            (
                data.enabled !==
                undefined
                    ? ` · ${data.enabled ? "Enabled" : "Disabled"}`
                    : ""
            )
        );

    }


    if (data.worker) {

        return (
            data.message ||
            `Worker: ${
                data.worker.status ||
                "RUNNING"
            }`
        );

    }


    return (
        data.message ||
        "NEXUS accepted the request."
    );

}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    title,
    message,
    icon = "✓"
) {

    const toast =
        $("toast");


    if (!toast) {

        console.log(
            `[${title}] ${message}`
        );

        return;

    }


    const toastTitle =
        $("toast-title");


    const toastMessage =
        $("toast-message");


    const toastIcon =
        $("toast-icon");


    if (toastTitle) {

        toastTitle.textContent =
            title;

    }


    if (toastMessage) {

        toastMessage.textContent =
            message;

    }


    if (toastIcon) {

        toastIcon.textContent =
            icon;

    }


    toast.classList.remove(
        "hidden"
    );


    clearTimeout(
        window.nexusToastTimer
    );


    window.nexusToastTimer =
        setTimeout(
            () => {

                toast.classList.add(
                    "hidden"
                );

            },
            4000
        );

}


/* =========================================================
   ACTION DEFINITIONS
========================================================= */

const ACTIONS = {


    /* =====================================================
       CREATE JOB
    ===================================================== */

    "create-job": {

        kicker:
            "WORK",

        title:
            "Create New Job",

        description:
            "Submit a new piece of work to NEXUS.",

        endpointKey:
            "createJob",

        submit:
            "Create Job",

        fields: [

            {
                name:
                    "id",

                label:
                    "Job ID",

                type:
                    "text",

                placeholder:
                    "job-001",

                required:
                    true
            },


            {
                name:
                    "type",

                label:
                    "Job Type",

                type:
                    "text",

                placeholder:
                    "email",

                required:
                    true
            },


            {
                name:
                    "body",

                label:
                    "Job Body",

                type:
                    "textarea",

                placeholder:
                    '{"message":"Hello NEXUS"}',

                required:
                    true
            }

        ]

    },


    /* =====================================================
       JOB STATUS
    ===================================================== */

    "job-status": {

        kicker:
            "WORK",

        title:
            "Check Job Status",

        description:
            "Retrieve the current state of a job.",

        endpointKey:
            "jobStatus",

        submit:
            "Check Status",

        fields: [

            {
                name:
                    "job_id",

                label:
                    "Job ID",

                type:
                    "text",

                placeholder:
                    "job-001",

                required:
                    true
            }

        ]

    },


    /* =====================================================
       JOB HISTORY
    ===================================================== */

    "job-history": {

        kicker:
            "WORK",

        title:
            "View Job History",

        description:
            "Retrieve the recorded history for a job.",

        endpointKey:
            "jobHistory",

        submit:
            "View History",

        fields: [

            {
                name:
                    "job_id",

                label:
                    "Job ID",

                type:
                    "text",

                placeholder:
                    "job-001",

                required:
                    true
            }

        ]

    },


    /* =====================================================
       PROCESS NEXT
    ===================================================== */

    "process-next": {

        kicker:
            "WORKER",

        title:
            "Process Next Job",

        description:
            "Ask the worker to process the oldest pending job.",

        endpointKey:
            "processNext",

        submit:
            "Process",

        fields:
            []

    },


    /* =====================================================
       RETRY JOB
    ===================================================== */

    "retry-job": {

        kicker:
            "RECOVERY",

        title:
            "Retry Job",

        description:
            "Move a retryable job back into the pending queue.",

        endpointKey:
            "retryJob",

        submit:
            "Retry",

        fields: [

            {
                name:
                    "job_id",

                label:
                    "Job ID",

                type:
                    "text",

                placeholder:
                    "failure-test-001",

                required:
                    true
            }

        ]

    },


    /* =====================================================
       TRIGGER FAILURE
    ===================================================== */

    "trigger-failure": {

        kicker:
            "FAILURE MODE",

        title:
            "Trigger Failure",

        description:
            "Enable a controlled worker failure mode.",

        endpointKey:
            "triggerFailure",

        submit:
            "Trigger",

        fields: [

            {
                name:
                    "failure",

                label:
                    "Failure Mode",

                type:
                    "select",

                options: [

                    [
                        "worker_crash",
                        "Crash Worker Once"
                    ],

                    [
                        "crash_always",
                        "Crash Worker Always"
                    ],

                    [
                        "slow_worker",
                        "Slow Worker"
                    ],

                    [
                        "duplicate_delivery",
                        "Duplicate Delivery"
                    ]

                ],

                required:
                    true
            }

        ]

    },


    /* =====================================================
       RESTART WORKER
    ===================================================== */

    "restart-worker": {

        kicker:
            "WORKER",

        title:
            "Restart Worker",

        description:
            "Reset worker state and return it to normal operation.",

        endpointKey:
            "restartWorker",

        submit:
            "Restart",

        fields:
            []

    },


    /* =====================================================
       SLOW MODE
    ===================================================== */

    "worker-slow": {

        kicker:
            "FAILURE MODE",

        title:
            "Slow Worker",

        description:
            "Enable deliberately slow worker processing.",

        endpointKey:
            "workerSlow",

        submit:
            "Enable",

        fields:
            []

    },


    /* =====================================================
       CRASH ONCE
    ===================================================== */

    "worker-crash": {

        kicker:
            "FAILURE MODE",

        title:
            "Crash Worker Once",

        description:
            "Arm the worker to fail on its next processed job.",

        endpointKey:
            "workerCrash",

        submit:
            "Crash Once",

        fields:
            []

    }

};


/* =========================================================
   OPEN ACTION MODAL
========================================================= */

function openAction(
    actionKey
) {

    const action =
        ACTIONS[actionKey];


    if (!action) {

        console.error(
            "Unknown action:",
            actionKey
        );

        return;

    }


    activeAction =
        actionKey;


    if ($("modal-kicker")) {

        $("modal-kicker").textContent =
            action.kicker;

    }


    if ($("modal-title")) {

        $("modal-title").textContent =
            action.title;

    }


    if ($("modal-description")) {

        $("modal-description").textContent =
            action.description;

    }


    if ($("modal-submit")) {

        $("modal-submit").textContent =
            action.submit;

    }


    renderFields(
        action.fields
    );


    if ($("modal-backdrop")) {

        $("modal-backdrop")
            .classList
            .remove(
                "hidden"
            );

    }

}


/* =========================================================
   RENDER MODAL FIELDS
========================================================= */

function renderFields(
    fields
) {

    const container =
        $("modal-fields");


    if (!container) {

        return;

    }


    container.innerHTML =
        "";


    fields.forEach(
        field => {

            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.className =
                "field";


            const label =
                document.createElement(
                    "label"
                );


            label.setAttribute(
                "for",
                `field-${field.name}`
            );


            label.textContent =
                field.label;


            let input;


            /* TEXTAREA */

            if (
                field.type ===
                "textarea"
            ) {

                input =
                    document.createElement(
                        "textarea"
                    );


                input.rows =
                    6;

            }


            /* SELECT */

            else if (
                field.type ===
                "select"
            ) {

                input =
                    document.createElement(
                        "select"
                    );


                (
                    field.options ||
                    []
                ).forEach(
                    optionData => {

                        const option =
                            document.createElement(
                                "option"
                            );


                        option.value =
                            optionData[0];


                        option.textContent =
                            optionData[1];


                        input.appendChild(
                            option
                        );

                    }
                );

            }


            /* NORMAL INPUT */

            else {

                input =
                    document.createElement(
                        "input"
                    );


                input.type =
                    field.type ||
                    "text";

            }


            input.id =
                `field-${field.name}`;


            input.name =
                field.name;


            input.placeholder =
                field.placeholder ||
                "";


            if (
                field.value !==
                undefined
            ) {

                input.value =
                    field.value;

            }


            if (
                field.required
            ) {

                input.required =
                    true;

            }


            wrapper.appendChild(
                label
            );


            wrapper.appendChild(
                input
            );


            container.appendChild(
                wrapper
            );

        }
    );

}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal() {

    const backdrop =
        $("modal-backdrop");


    if (!backdrop) {

        return;

    }


    backdrop
        .classList
        .add(
            "hidden"
        );


    activeAction =
        null;

}


/* =========================================================
   COLLECT FORM DATA
========================================================= */

function collectFormData() {

    const data =
        {};


    const container =
        $("modal-fields");


    if (!container) {

        return data;

    }


    const fields =
        container.querySelectorAll(
            "input, textarea, select"
        );


    fields.forEach(
        field => {

            data[
                field.name
            ] =
                field.value;

        }
    );


    return data;

}


/* =========================================================
   BUILD ENDPOINT
========================================================= */

function buildEndpoint(
    endpoint,
    data
) {

    if (!endpoint) {

        return null;

    }


    if (
        endpoint.includes(
            ":job_id"
        )
    ) {

        if (!data.job_id) {

            throw new Error(
                "Job ID is required."
            );

        }


        return endpoint.replace(
            ":job_id",
            encodeURIComponent(
                data.job_id
            )
        );

    }


    return endpoint;

}


/* =========================================================
   SUBMIT ACTION
========================================================= */

async function submitAction() {

    if (!activeAction) {

        return;

    }


    const action =
        ACTIONS[
            activeAction
        ];


    if (!action) {

        return;

    }


    const endpoint =
        ENDPOINTS[
            action.endpointKey
        ];


    if (!endpoint) {

        showToast(
            "Backend Route Missing",
            `${action.title} is not connected to a backend endpoint.`,
            "!"
        );


        return;

    }


    const data =
        collectFormData();


    /* =====================================================
       CREATE JOB
    ===================================================== */

    if (
        action.endpointKey ===
        "createJob"
    ) {

        let body;


        try {

            body =
                JSON.parse(
                    data.body
                );

        }

        catch {

            showToast(
                "Invalid JSON",
                "Job Body must contain valid JSON.",
                "!"
            );


            return;

        }


        const payload = {

            id:
                data.id,

            type:
                data.type,

            body:
                body

        };


        try {

            const result =
                await apiRequest(
                    endpoint,
                    {
                        method:
                            "POST",

                        body:
                            JSON.stringify(
                                payload
                            )
                    }
                );


            const duplicate =
                result?.created === false;


            showToast(
                duplicate
                    ? "Duplicate Job"
                    : "Job Created",

                formatApiResult(
                    result
                ),

                duplicate
                    ? "!"
                    : "✓"
            );


            closeModal();


            await loadDashboard();

        }

        catch (error) {

            showToast(
                "Create Job Failed",
                error.message,
                "!"
            );

        }


        return;

    }


    /* =====================================================
       JOB STATUS
    ===================================================== */

    if (
        action.endpointKey ===
        "jobStatus"
    ) {

        try {

            const path =
                buildEndpoint(
                    endpoint,
                    data
                );


            const result =
                await apiRequest(
                    path,
                    {
                        method:
                            "GET"
                    }
                );


            showToast(
                "Job Status",
                formatApiResult(
                    result
                ),
                "✓"
            );


            closeModal();


            await loadDashboard();

        }

        catch (error) {

            showToast(
                "Status Check Failed",
                error.message,
                "!"
            );

        }


        return;

    }


    /* =====================================================
       JOB HISTORY
    ===================================================== */

    if (
        action.endpointKey ===
        "jobHistory"
    ) {

        try {

            const path =
                buildEndpoint(
                    endpoint,
                    data
                );


            const result =
                await apiRequest(
                    path,
                    {
                        method:
                            "GET"
                    }
                );


            showToast(
                "Job History",
                formatApiResult(
                    result
                ),
                "✓"
            );


            closeModal();

        }

        catch (error) {

            showToast(
                "History Request Failed",
                error.message,
                "!"
            );

        }


        return;

    }


    /* =====================================================
       PROCESS NEXT
    ===================================================== */

    if (
        action.endpointKey ===
        "processNext"
    ) {

        try {

            const result =
                await apiRequest(
                    endpoint,
                    {
                        method:
                            "POST"
                    }
                );


            showToast(
                "Worker Action",
                formatApiResult(
                    result
                ),
                "✓"
            );


            closeModal();


            await loadDashboard();

        }

        catch (error) {

            showToast(
                "Worker Action Failed",
                error.message,
                "!"
            );

        }


        return;

    }


    /* =====================================================
       RETRY JOB
    ===================================================== */

    if (
        action.endpointKey ===
        "retryJob"
    ) {

        if (!data.job_id) {

            showToast(
                "Retry Failed",
                "Please enter a Job ID.",
                "!"
            );


            return;

        }


        try {

            const path =
                buildEndpoint(
                    endpoint,
                    data
                );


            const result =
                await apiRequest(
                    path,
                    {
                        method:
                            "POST"
                    }
                );


            showToast(
                "Job Retry",
                formatApiResult(
                    result
                ),
                "✓"
            );


            closeModal();


            await loadDashboard();

        }

        catch (error) {

            showToast(
                "Retry Failed",
                error.message,
                "!"
            );

        }


        return;

    }


    /* =====================================================
       TRIGGER FAILURE
    ===================================================== */

    if (
        action.endpointKey ===
        "triggerFailure"
    ) {

        const failure =
            data.failure ||
            "worker_crash";


        try {

            const result =
                await apiRequest(
                    endpoint,
                    {
                        method:
                            "POST",

                        body:
                            JSON.stringify(
                                {
                                    failure:
                                        failure
                                }
                            )
                    }
                );


            showToast(
                "Failure Mode Enabled",
                formatApiResult(
                    result
                ),
                "!"
            );


            closeModal();


            await loadDashboard();

        }

        catch (error) {

            showToast(
                "Failure Mode Failed",
                error.message,
                "!"
            );

        }


        return;

    }


    /* =====================================================
       RESTART WORKER
    ===================================================== */

    if (
        action.endpointKey ===
        "restartWorker"
    ) {

        try {

            const result =
                await apiRequest(
                    endpoint,
                    {
                        method:
                            "POST"
                    }
                );


            showToast(
                "Worker Restarted",
                formatApiResult(
                    result
                ),
                "✓"
            );


            closeModal();


            await loadDashboard();

        }

        catch (error) {

            showToast(
                "Restart Failed",
                error.message,
                "!"
            );

        }


        return;

    }


    /* =====================================================
       SLOW MODE
    ===================================================== */

    if (
        action.endpointKey ===
        "workerSlow"
    ) {

        try {

            const result =
                await apiRequest(
                    endpoint,
                    {
                        method:
                            "POST"
                    }
                );


            showToast(
                "Slow Mode Enabled",
                formatApiResult(
                    result
                ),
                "✓"
            );


            closeModal();


            await loadDashboard();

        }

        catch (error) {

            showToast(
                "Slow Mode Failed",
                error.message,
                "!"
            );

        }


        return;

    }


    /* =====================================================
       CRASH ONCE
    ===================================================== */

    if (
        action.endpointKey ===
        "workerCrash"
    ) {

        try {

            const result =
                await apiRequest(
                    endpoint,
                    {
                        method:
                            "POST"
                    }
                );


            showToast(
                "Crash Once Armed",
                formatApiResult(
                    result
                ),
                "!"
            );


            closeModal();


            await loadDashboard();

        }

        catch (error) {

            showToast(
                "Crash Once Failed",
                error.message,
                "!"
            );

        }


        return;

    }

}


/* =========================================================
   BUTTON / MODAL BINDINGS
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {


        /* =================================================
           ACTION BUTTONS
        ================================================= */

        document
            .querySelectorAll(
                "[data-action]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            openAction(
                                button.dataset.action
                            );

                        }
                    );

                }
            );


        /* =================================================
           MODAL FORM
        ================================================= */

        const form =
            $("action-form");


        if (form) {

            form.addEventListener(
                "submit",
                event => {

                    event.preventDefault();


                    submitAction();

                }
            );

        }


        /* =================================================
           CLOSE BUTTON
        ================================================= */

        const closeButton =
            $("modal-close");


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                closeModal
            );

        }


        /* =================================================
           CANCEL BUTTON
        ================================================= */

        const cancelButton =
            $("modal-cancel");


        if (cancelButton) {

            cancelButton.addEventListener(
                "click",
                closeModal
            );

        }


        /* =================================================
           CLICK OUTSIDE MODAL
        ================================================= */

        const backdrop =
            $("modal-backdrop");


        if (backdrop) {

            backdrop.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        backdrop
                    ) {

                        closeModal();

                    }

                }
            );

        }


        /* =================================================
           REFRESH BUTTON
        ================================================= */

        const refreshButton =
            $("refresh-btn");


        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                loadDashboard
            );

        }


        /* =================================================
           INITIAL LOAD
        ================================================= */

        loadDashboard();


        /* =================================================
           AUTO REFRESH
        ================================================= */

        setInterval(
            loadDashboard,
            5000
        );

    }
);