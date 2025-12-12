# AI Testing Agent - Architecture

## System Overview

This document describes the architecture and data flow of the AI Testing Agent platform.

## Venn Diagram - Component Relationships

![AI Testing Agent Architecture Venn Diagram](./venn_diagram.png)

The Venn diagram above shows how the four main component groups interact:

| Overlap | Components | Shared Responsibility |
|---------|------------|----------------------|
| **Center** | All | Test Run Data lifecycle |
| **Backend ↔ Infrastructure** | API ↔ PostgreSQL | Database queries via Prisma |
| **Backend ↔ Worker** | API ↔ BullMQ | Redis job queue |
| **Worker ↔ Infrastructure** | Runner ↔ MinIO | Artifact storage & retrieval |

## Architecture Diagram

```mermaid
flowchart TB
    subgraph "User Interfaces"
        CLI["🖥️ CLI<br/>(ai-tester)"]
        Frontend["🌐 Frontend<br/>(Next.js :3000)"]
        VSCode["🔧 VS Code Extension"]
    end

    subgraph "Backend Service"
        API["⚡ Fastify API<br/>(:3001)"]
        subgraph "Routes"
            R1["/api/runs"]
            R2["/api/analyze"]
            R3["/api/keys"]
        end
    end

    subgraph "Data Layer"
        Postgres[(🐘 PostgreSQL<br/>TestRuns, Logs)]
        Redis[(🔴 Redis<br/>Job Queue)]
    end

    subgraph "Worker Service"
        BullMQ["📋 BullMQ Worker"]
        subgraph "Processing Pipeline"
            LLM["🤖 LLM Module<br/>(OpenAI GPT-4o)"]
            Runner["🎭 Playwright Runner"]
        end
    end

    subgraph "Storage"
        MinIO["📦 MinIO<br/>(Screenshots, Videos, Traces)"]
    end

    %% User Flow
    CLI --> |"HTTP POST"| API
    Frontend --> |"HTTP POST"| API
    VSCode --> |"HTTP POST"| API

    %% API Flow
    API --> R1
    API --> R2
    API --> R3
    R1 --> |"1. Create TestRun"| Postgres
    R1 --> |"2. Queue Job"| Redis

    %% Worker Flow
    Redis --> |"3. Pick Job"| BullMQ
    BullMQ --> |"4. Update Status: RUNNING"| Postgres
    BullMQ --> |"5. Generate Test"| LLM
    LLM --> |"6. Playwright Code"| Runner
    Runner --> |"7. Execute Tests"| Runner
    Runner --> |"8. Upload Artifacts"| MinIO
    BullMQ --> |"9. Update Status: COMPLETED/FAILED"| Postgres

    %% Result retrieval
    Frontend --> |"Poll GET /runs/:id"| API
    API --> |"Fetch Results"| Postgres
    Postgres --> |"Return + Artifact URLs"| API

    classDef userInterface fill:#e1f5fe,stroke:#01579b
    classDef backend fill:#fff3e0,stroke:#e65100
    classDef data fill:#f3e5f5,stroke:#7b1fa2
    classDef worker fill:#e8f5e9,stroke:#2e7d32
    classDef storage fill:#fce4ec,stroke:#c2185b

    class CLI,Frontend,VSCode userInterface
    class API,R1,R2,R3 backend
    class Postgres,Redis data
    class BullMQ,LLM,Runner worker
    class MinIO storage
```

## Component Details

### User Interfaces

| Component | Technology | Port | Description |
|-----------|------------|------|-------------|
| **Frontend** | Next.js 16 | 3000 | Web dashboard to create test runs and view results |
| **CLI** | Commander.js | - | Terminal tool for CI/CD integration |
| **VS Code Extension** | VS Code API | - | In-editor test creation |

### Backend

| Component | Technology | Port | Description |
|-----------|------------|------|-------------|
| **API Server** | Fastify | 3001 | REST API for test run management |
| **ORM** | Prisma | - | Database access layer |
| **Queue** | BullMQ | - | Job queue producer |

### Worker

| Component | Technology | Description |
|-----------|------------|-------------|
| **Job Processor** | BullMQ Worker | Consumes jobs from Redis queue |
| **LLM Module** | OpenAI GPT-4o | Generates Playwright test scripts |
| **Test Runner** | Playwright | Executes tests with Chrome |

### Infrastructure (Docker)

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| **PostgreSQL** | postgres:15-alpine | 5432 | Persistent data storage |
| **Redis** | redis:alpine | 6379 | Job queue & caching |
| **MinIO** | minio/minio | 9000, 9001 | Artifact storage (S3-compatible) |

## Data Flow

### Test Run Lifecycle

1. **User Request** → User submits URL + prompt via Frontend/CLI/Extension
2. **Job Creation** → Backend creates `TestRun` in PostgreSQL (status: `QUEUED`)
3. **Queue Push** → Job pushed to Redis via BullMQ
4. **Worker Pickup** → Worker pulls job, updates status to `RUNNING`
5. **Test Generation** → LLM generates Playwright test code
6. **Test Execution** → Playwright runs the generated test
7. **Artifact Upload** → Screenshots/videos uploaded to MinIO
8. **Result Storage** → Worker updates PostgreSQL with results
9. **Result Display** → Frontend polls and displays results with artifact URLs

### Status Flow

```mermaid
stateDiagram-v2
    [*] --> QUEUED: Create Test Run
    QUEUED --> RUNNING: Worker picks up job
    RUNNING --> COMPLETED: Test passes
    RUNNING --> FAILED: Test fails or error
    COMPLETED --> [*]
    FAILED --> [*]
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/runs` | Create a new test run |
| `GET` | `/api/runs` | List recent test runs |
| `GET` | `/api/runs/:id` | Get test run details |
| `POST` | `/api/analyze` | Analyze a URL |
| `GET` | `/api/keys` | Get API key status |

## Environment Variables

### Backend (`.env`)
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/ai_tester
REDIS_URL=redis://localhost:6379
```

### Worker (`.env`)
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/ai_tester
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your_openai_api_key
```
