# ⚡ Pulse — Uptime Monitoring & Alerting System

> **Know when your services go down — before your users do.**

Pulse is a cloud-native **uptime monitoring and alerting platform** that continuously monitors HTTP endpoints, detects persistent failures using a **3-strike state machine**, processes health checks asynchronously through **Amazon SQS + AWS Lambda**, streams status changes in real time using **Server-Sent Events**, and sends email alerts through **Amazon SES**.

Built with a decoupled backend architecture designed to demonstrate real-world **event-driven and serverless system design**.

---

## 🧠 What Problem Does Pulse Solve?

A simple uptime checker might look like:

```text
setInterval() → HTTP Request → Database
```

That works for a small number of URLs, but it doesn't scale well.

Pulse evolves that idea into:

```text
                    ┌──────────────────┐
                    │   React Dashboard │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Express API     │
                    │   Control Plane  │
                    └───────┬──────────┘
                            │
                            ▼
                    ┌──────────────────┐
                    │   PostgreSQL     │
                    │     + Prisma     │
                    └───────┬──────────┘
                            │
                     Scheduled Dispatch
                            │
                            ▼
                    ┌──────────────────┐
                    │    Amazon SQS    │
                    │  Message Queue   │
                    └───────┬──────────┘
                            │
                      Auto-trigger
                            │
                            ▼
                    ┌──────────────────┐
                    │   AWS Lambda     │
                    │  Cloud Workers   │
                    └───────┬──────────┘
                            │
                       HTTP Health Check
                            │
                            ▼
                    ┌──────────────────┐
                    │   Express        │
                    │ Webhook Callback │
                    └───────┬──────────┘
                            │
                 ┌──────────┴──────────┐
                 ▼                     ▼
          ┌─────────────┐       ┌─────────────┐
          │ PostgreSQL  │       │  SSE Stream │
          └─────────────┘       └──────┬──────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ React Dashboard │
                              └─────────────────┘

                         DOWN after 3 failures
                                  │
                                  ▼
                           Amazon SES Email
```

---

# ✨ Features

### 🔍 HTTP Endpoint Monitoring

Monitor any HTTP/HTTPS endpoint and track:

* Response status
* Availability
* Failure count
* Last checked timestamp
* Response latency

### 🛡️ 3-Strike Failure Detection

Pulse avoids sending alerts for temporary network failures.

```text
            HTTP Success
                 │
                 ▼
              ┌─────┐
              │ UP  │
              └──┬──┘
                 │
              Failure
                 ▼
          ┌─────────────┐
          │  DEGRADED   │
          │ Strike: 1   │
          └──────┬──────┘
                 │
              Failure
                 ▼
          ┌─────────────┐
          │  DEGRADED   │
          │ Strike: 2   │
          └──────┬──────┘
                 │
              Failure
                 ▼
          ┌─────────────┐
          │     DOWN    │
          │ Strike: 3+  │
          └─────────────┘
                 │
                 ▼
            🚨 Alert
```

A successful check immediately restores the monitor:

```text
DOWN / DEGRADED
       │
   HTTP 200
       ▼
      UP
       │
failureCount = 0
```

---

# ☁️ Event-Driven Architecture

Instead of performing every health check directly inside the Express server, Pulse uses **Amazon SQS** to distribute monitoring jobs.

```text
Scheduler
   │
   │ { monitorId, url }
   ▼
Amazon SQS
   │
   │ Event
   ▼
AWS Lambda
   │
   │ HTTP GET
   ▼
Target Service
   │
   │ status + latency
   ▼
Express Webhook
   │
   ├──────────────► PostgreSQL
   │
   ├──────────────► SSE Clients
   │
   └──────────────► Amazon SES
                         │
                         ▼
                       Email
```

This keeps the monitoring workers independent from the main API and allows health-check execution to scale independently.

---

# 🧩 Tech Stack

| Layer             | Technology               |
| ----------------- | ------------------------ |
| Backend           | Node.js + Express        |
| Database          | PostgreSQL               |
| ORM               | Prisma                   |
| Database Hosting  | Neon / Supabase          |
| Queue             | Amazon SQS               |
| Compute           | AWS Lambda               |
| Email             | Amazon SES               |
| Real-time Updates | Server-Sent Events       |
| Frontend          | React + Vite             |
| UI                | Tailwind CSS + Shadcn UI |
| State Management  | Zustand                  |
| HTTP Client       | Axios / Fetch            |
| Cloud SDK         | AWS SDK for JavaScript   |
| Development       | Docker                   |

---

# 📁 Project Structure

```text
pulse-uptime-monitor/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── AWS clients
│   │   │
│   │   ├── controllers/
│   │   │   └── API route handlers
│   │   │
│   │   ├── routes/
│   │   │   └── Express routes
│   │   │
│   │   ├── services/
│   │   │   └── Business & monitoring logic
│   │   │
│   │   ├── middleware/
│   │   │   └── Validation & error handling
│   │   │
│   │   ├── utils/
│   │   │   └── Helper functions
│   │   │
│   │   └── app.js
│   │
│   ├── prisma/
│   │   └── schema.prisma
│   │
│   ├── .env
│   └── package.json
│
├── lambda/
│   ├── index.js
│   └── package.json
│
├── frontend/
│   └── React dashboard
│
└── README.md
```

The backend is intentionally separated into controllers, routes, services, middleware, utilities, and configuration to keep responsibilities decoupled.

---

# 🗄️ Data Model

Each monitored endpoint is represented by a monitor record.

```text
Monitor
────────────────────────────
id
name
url
status
failureCount
lastChecked
```

Example:

```json
{
  "name": "Payment Gateway",
  "url": "https://api.example.com/health",
  "status": "UP",
  "failureCount": 0,
  "lastChecked": "2026-09-16T15:30:00Z"
}
```

Supported states:

```text
UP
DEGRADED
DOWN
```

The PostgreSQL database acts as the system's source of truth.

---

# 🔄 Monitoring Lifecycle

A complete monitoring cycle looks like this:

### 1. Register Monitor

```http
POST /api/monitors
```

```json
{
  "name": "Google Check",
  "url": "https://google.com"
}
```

### 2. Dispatcher Creates Job

```json
{
  "monitorId": "a1b2c3d4-...",
  "url": "https://google.com"
}
```

### 3. Job Enters SQS

```text
Express
   ↓
AWS SDK
   ↓
Pulse-URL-Queue
```

### 4. Lambda Consumes Job

Lambda receives the SQS message and performs an HTTP request with a **5-second timeout**.

### 5. Lambda Sends Result

```http
POST /api/webhook/ping-result
```

```json
{
  "monitorId": "a1b2c3d4-...",
  "statusCode": 500,
  "latencyMs": 143,
  "error": null
}
```

### 6. State Machine Processes Result

```text
Success
   → UP
   → failureCount = 0

Failure #1
   → DEGRADED
   → failureCount = 1

Failure #2
   → DEGRADED
   → failureCount = 2

Failure #3
   → DOWN
   → failureCount = 3
```

### 7. Real-Time Update

The backend broadcasts the new state through SSE.

### 8. Alert

When the monitor reaches `DOWN`, Amazon SES sends an email notification.

---

# ⚡ Real-Time Updates with SSE

Pulse uses **Server-Sent Events** instead of WebSockets for dashboard updates.

```http
GET /api/stream
```

Example event:

```text
data: {
  "monitorId": "a1b2c3d4-...",
  "status": "DOWN",
  "failureCount": 3
}
```

The browser can consume this using the native `EventSource` API.

```javascript
const events = new EventSource("/api/stream");

events.onmessage = (event) => {
  const data = JSON.parse(event.data);

  console.log(data);
};
```

This allows the dashboard to update without polling or refreshing the page.

---

# 🚨 Email Alerting

Pulse only sends an alert when a service reaches the actual `DOWN` state.

```text
Failure #1
    ↓
DEGRADED
    ↓
No email

Failure #2
    ↓
DEGRADED
    ↓
No email

Failure #3
    ↓
DOWN
    ↓
🚨 Amazon SES
    ↓
📧 Email
```

Example notification:

```text
Subject:
[URGENT] Monitor Alert: Payment Gateway is DOWN

Your monitored endpoint failed 3 consecutive health checks.

Last error: HTTP 500
```

This prevents noisy alerts caused by temporary failures.

---

# 🖥️ Dashboard

The React dashboard provides:

* 📊 Monitor overview
* 🟢 UP / 🟡 DEGRADED / 🔴 DOWN status
* 🔗 Monitored URLs
* ⏱️ Last check information
* 📡 Real-time event feed
* ➕ Add monitor functionality

Planned frontend structure:

```text
frontend/
└── src/
    ├── components/
    │   ├── MonitorTable.jsx
    │   ├── AddMonitorModal.jsx
    │   └── EventFeed.jsx
    │
    ├── store/
    │   └── useMonitorStore.js
    │
    ├── App.jsx
    └── main.jsx
```

---

# 🧪 Failure Simulation

Pulse includes an end-to-end failure scenario to verify the complete architecture.

```text
                 Service
                    │
              HTTP 200 OK
                    │
                    ▼
                  UP 🟢

             Service fails
                    │
                    ▼
              HTTP 500
                    │
                    ▼
             DEGRADED 🟡
              Strike #1

             HTTP 500
                    │
                    ▼
             DEGRADED 🟡
              Strike #2

             HTTP 500
                    │
                    ▼
                DOWN 🔴
              Strike #3
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
       SSE Update          SES Alert
          │                   │
          ▼                   ▼
      Dashboard             Email
```

The project specification uses a simulated outage to verify the complete SQS → Lambda → Express → SSE → SES lifecycle.

---

# 🚀 Getting Started

## Prerequisites

Make sure you have:

* Node.js
* PostgreSQL database
* Prisma
* AWS account
* AWS SQS queue
* AWS Lambda
* Amazon SES configured

---

## 1️⃣ Clone

```bash
git clone https://github.com/<your-username>/pulse-uptime-mon
```
