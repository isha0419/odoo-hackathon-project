# AssetFlow

**Enterprise Asset & Resource Management System** — track every asset from registration to
retirement: who holds it, who booked it, who's fixing it, and whether it's actually where the
audit says it should be.

Built in an 8-hour hackathon sprint by a 4-developer team plus an integration lead, on a
frozen contract-first design so every track could parallelize from minute one.

[![Stack](https://img.shields.io/badge/backend-FastAPI%20%2B%20PostgreSQL-009688)]()
[![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-61DAFB)]()
[![Auth](https://img.shields.io/badge/auth-JWT%20%2B%20bcrypt-informational)]()
[![License](https://img.shields.io/badge/license-unspecified-lightgrey)]()

---

## Why it's interesting

Most CRUD asset trackers stop at "create, read, update." AssetFlow enforces the two rules that
actually make an asset registry trustworthy, at **both the application layer and the database
layer**, so they can never be bypassed by a bug, a race condition, or a second person clicking
at the same time:

- **Double-allocation is structurally impossible.** A Postgres partial unique index
  (`one_active_allocation_per_asset`) guarantees at most one open allocation per asset. The
  service layer checks this first and returns a friendly `409` naming the current holder and
  offering a transfer — the database constraint is the backstop if it doesn't.
- **Booking overlaps are structurally impossible.** A `GIST` exclusion constraint
  (`no_overlapping_bookings`, via `btree_gist` on `tstzrange`) makes two conflicting bookings
  for the same resource physically unrepresentable in the table, with the same friendly-`409`
  service pre-check in front of it.

Everything else — allocation, transfer approvals, maintenance kanban, audit cycles, dashboards,
reports, notifications — is built around those two guarantees.

## Feature tour

| Area | What it does |
|---|---|
| **Auth & RBAC** | Self-rolled JWT auth (bcrypt + `python-jose`). Signup always creates an `EMPLOYEE`; roles change only via the Admin-driven employee directory — never self-assigned. |
| **Org setup** | Departments (with parent/child hierarchy), asset categories with JSON custom fields, employee directory with role/status management. |
| **Asset registry** | Auto-generated tags (`AF-0001`, `AF-0002`, …) via a DB sequence — no race conditions under concurrent registration. Full lifecycle status, condition, location, custom field values. |
| **Allocation & transfer** | Allocate/return with condition notes; request → approve/reject transfer workflow that atomically re-allocates in one transaction. |
| **Resource booking** | Calendar-style booking for bookable assets (rooms, vehicles) with derived `UPCOMING → ONGOING → COMPLETED` status and hard overlap prevention. |
| **Maintenance** | Kanban workflow (`PENDING → APPROVED → TECHNICIAN_ASSIGNED → IN_PROGRESS → RESOLVED`, or `REJECTED`) that drives the asset's lifecycle status automatically. |
| **Audit cycles** | Scoped audit cycles with assigned auditors, snapshot-based audit items, and an auto-generated discrepancy report on close — missing items flip the asset to `LOST`. |
| **Dashboard & reports** | Live KPIs (overdue returns highlighted), utilization/idle/most-used/maintenance-frequency/booking-heatmap reports, CSV export. |
| **Notifications & activity log** | Event-driven notifications (assignment, approval, booking, transfer, audit) plus derived ones (`OVERDUE_RETURN`, `BOOKING_REMINDER`) computed on read since there's no scheduler. Namespaced, append-only activity log for every state change. |

See [`docs/design.md`](docs/design.md) for the frozen source-of-truth spec, and
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for data models, workflows, and diagrams.

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Python, **FastAPI**, **SQLAlchemy 2.0**, **Alembic**, **Pydantic v2**, Uvicorn |
| Database | **PostgreSQL 16** (`pgcrypto`, `btree_gist`, `citext` extensions) |
| Auth | JWT (`python-jose`) + `passlib[bcrypt]` — no managed BaaS, no RLS; authorization lives in FastAPI dependencies |
| Frontend | **React** + **Vite** |
| Packaging | **Docker Compose** — one command builds and runs the whole stack |
| Quality | `ruff` (lint + format), `pytest` |

## Quick start

Requires Docker and Docker Compose. No local Python/Node install needed.

```bash
git clone https://github.com/isha0419/odoo-hackathon-project.git
cd odoo-hackathon-project
docker compose up -d --build
```

That single command:
1. Builds the `postgres`, `api`, and `frontend` images.
2. Starts Postgres and waits for its healthcheck.
3. Runs `alembic upgrade head` — creates every table, enum, and constraint from a clean DB.
4. Runs the idempotent demo seed (`app.seed.seed`) — departments, categories, ~50 assets,
   allocations, bookings, maintenance requests, an audit cycle, notifications, activity log.
5. Starts the API (hot-reload) and the frontend dev server (hot-reload).

Then open:
- **Frontend:** http://localhost:5173
- **API docs (Swagger):** http://localhost:8000/docs

The seed script prints a demo login table (admin / asset manager / department head / employee
accounts) to the `api` container logs on first boot:

```bash
docker compose logs api | grep -A 20 "Demo logins"
```

**Useful commands:**

```bash
docker compose down                                   # stop (data persisted)
docker compose down -v                                # stop + wipe DB (fresh start)
docker compose logs -f api                             # tail API logs
docker compose exec api python -m app.seed.seed --reset # force a clean re-seed
docker compose exec api pytest                          # run backend tests
docker compose exec api ruff check .                    # lint
```

## Best practices baked into the build

- **Contract-first parallel development.** The data model, enums, and full API surface were
  frozen in [`docs/design.md`](docs/design.md) *before* any track wrote code, so four
  developers could build against agreed contracts simultaneously instead of blocking on each
  other. See Section 12 of the design doc for the track/ownership split.
- **Layered architecture, enforced by folder.** `routers/` (HTTP + auth guard, thin) →
  `services/` (business logic, transactions, conflict rules) → `models/` (SQLAlchemy) +
  `schemas/` (Pydantic). Routers never touch the ORM directly; services never touch
  `Request`/`Response`.
- **Defense in depth on the two conflict-prone workflows.** Both crown-jewel rules (double
  allocation, booking overlap) are enforced at the service layer *and* the database layer —
  the friendly error comes from the service, the guarantee comes from the constraint.
- **One shared write point.** `main.py` is touched only to add `app.include_router(...)`
  lines, alphabetized, one per module — this was the single shared file across four parallel
  tracks and kept merges conflict-free.
- **Idempotent, deterministic seeding.** The seed script upserts by natural key
  (`get_or_create`), seeds timestamps relative to `now()` (not hard-coded dates) so
  overdue/upcoming demo data is always correct whenever the stack starts, and is
  deterministic (`random.seed(42)`) so every teammate sees the same demo data.
- **One-command, zero-manual-step orchestration.** `docker compose up -d --build` builds,
  migrates, seeds, and serves — no separate terminal commands, no forgetting a step before a
  demo.
- **Hot-reload dev volumes, immutable `node_modules`.** Source is bind-mounted for instant
  reload; the frontend container keeps its own build-time `node_modules` via an anonymous
  volume so host/container dependency drift can't happen.
- **Git worktrees for isolated fix branches.** Integration/review fixes are made on dedicated
  branches in separate worktrees, never on the shared working directory teammates are actively
  using — avoids cross-branch commit accidents during parallel development.

## Repository layout

```
odoo-hackathon-project/
├── docker-compose.yml         # one command: build + migrate + seed + run everything
├── docs/
│   ├── design.md              # frozen source-of-truth spec
│   ├── ARCHITECTURE.md         # data models, workflows, diagrams (this build's actual state)
│   └── implementation_plan.md # stage-by-stage task breakdown
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/versions/      # one migration history, shared across all tracks
│   └── app/
│       ├── main.py            # app factory + router registration only
│       ├── config.py          # settings from env
│       ├── db.py               # engine, SessionLocal, get_db()
│       ├── security.py        # hashing, JWT encode/decode
│       ├── deps.py             # get_current_user, require_role(...)
│       ├── models/             # one file per entity (SQLAlchemy)
│       ├── schemas/            # one file per module (Pydantic)
│       ├── routers/            # one file per module (HTTP layer)
│       ├── services/           # one file per module (business logic)
│       └── seed/seed.py        # demo data generator
└── frontend/                  # React + Vite, consumes the API above
```

## License

Not yet specified.

# AssetFlow (Odoo Hackathon Project)

AssetFlow is a comprehensive Asset Management System designed to seamlessly manage the complete lifecycle of assets, allocations, resource bookings, maintenance, and audits. 

The system is fully stabilized and features a robust backend (PostgreSQL + FastAPI) with a dynamic frontend (React).

---

## E2E Browser Testing Walkthrough

The backend is fully stabilized with the proper official seed data. We have executed an end-to-end automated browser test to verify that the frontend completely integrates with the backend and displays data correctly.

Here are the results of the complete workflow:

### 1. Authentication & Dashboard
The system successfully logs in Admin users (`admin@assetflow.io`) and displays the dashboard. The dashboard successfully aggregates all backend metrics (Available, Allocated, Under Maintenance, etc.) and lists recent activity.


### 2. Asset Registry & Filtering
The Assets page displays all seeded assets. The search filter correctly narrows the table down to just "Laptop" devices, proving the backend API search logic works seamlessly with the UI.


### 3. Allocations
The Allocations page successfully loads, allowing users to search for specific asset tags (e.g. `AF-0114`) and see active holders, expected return dates, and historical transfer requests.


### 4. Resource Bookings (Crown Jewel)
The Resource Booking calendar successfully loads, visually mapping out upcoming reservations and preventing overlapping timeslots in the frontend scheduler via backend ExcludeConstraints.


### 5. Maintenance Kanban Board
The Maintenance page features a fully functional Kanban board. Requests are cleanly organized into their respective statuses (Pending, Approved, In Progress, Resolved).


---

## Architecture (Headings & Diagrams from `docs/ARCHITECTURE.md`)

### Table of contents

### 1. System architecture

```mermaid
flowchart LR
    subgraph Client["Browser"]
        FE["React + Vite SPA<br/>(port 5173)"]
    end

    subgraph API["FastAPI Application (port 8000)"]
        direction TB
        MW["Auth dependency<br/>get_current_user / require_role"]
        R["Routers<br/>(HTTP + guards, thin)"]
        S["Services<br/>(business logic, transactions,<br/>conflict rules)"]
        M["Models (SQLAlchemy) +<br/>Schemas (Pydantic)"]
        MW --> R --> S --> M
    end

    subgraph DB["PostgreSQL 16"]
        direction TB
        EXT["Extensions:<br/>pgcrypto · btree_gist · citext"]
        TBL["Tables + Postgres enums"]
        CON["Constraints:<br/>one_active_allocation_per_asset (unique)<br/>no_overlapping_bookings (GIST exclude)"]
    end

    FE -- "JSON + JWT bearer token" --> MW
    M -- "SQLAlchemy" --> TBL
    TBL --- CON
    TBL --- EXT
```

### 2. Layered request flow

```mermaid
sequenceDiagram
    participant U as Employee/Manager (browser)
    participant R as routers/allocation.py
    participant D as deps.py (auth guard)
    participant S as services/allocation_service.py
    participant DB as PostgreSQL

    U->>R: POST /api/allocations {asset_id, holder_user_id}
    R->>D: get_current_user(token)
    D-->>R: current_user (id, role, department_id)
    R->>D: require_role(ADMIN, ASSET_MANAGER, DEPARTMENT_HEAD)
    D-->>R: 403 if role not permitted (request ends)
    R->>S: allocate(db, data, actor)
    S->>DB: SELECT active allocation WHERE asset_id = ...
    alt asset already allocated
        DB-->>S: existing ACTIVE row
        S-->>R: 409 asset_already_allocated + current_holder + suggested_action
        R-->>U: 409 (friendly conflict body)
    else asset free
        DB-->>S: none
        S->>DB: INSERT allocation (ACTIVE)
        S->>DB: UPDATE asset.status = ALLOCATED
        S->>DB: INSERT activity_logs("asset.allocated")
        S->>DB: INSERT notifications(ASSET_ASSIGNED)
        DB-->>S: commit
        S-->>R: AllocationOut
        R-->>U: 200 allocation created
    end
```

### 3. Data model

```mermaid
erDiagram
    DEPARTMENTS ||--o{ USERS : "has members"
    DEPARTMENTS ||--o| DEPARTMENTS : "parent (self-ref)"
    USERS ||--o| DEPARTMENTS : "heads (optional)"
    ASSET_CATEGORIES ||--o{ ASSETS : "categorizes"
    ASSETS ||--o{ ALLOCATIONS : "allocation history"
    ASSETS ||--o{ TRANSFER_REQUESTS : "transfer history"
    ASSETS ||--o{ BOOKINGS : "booking calendar"
    ASSETS ||--o{ MAINTENANCE_REQUESTS : "maintenance history"
    ASSETS ||--o{ AUDIT_ITEMS : "audited in cycles"
    USERS ||--o{ ALLOCATIONS : "holds / allocates"
    USERS ||--o{ TRANSFER_REQUESTS : "from / to / requested_by"
    USERS ||--o{ BOOKINGS : "books"
    USERS ||--o{ MAINTENANCE_REQUESTS : "raises"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ ACTIVITY_LOGS : "acts"
    AUDIT_CYCLES ||--o{ AUDIT_ITEMS : "snapshots assets"
    AUDIT_CYCLES }o--o{ USERS : "assigned auditors"

    USERS {
        uuid id PK
        text name
        citext email UK
        text password_hash
        user_role role
        uuid department_id FK
        active_status status
    }

    DEPARTMENTS {
        uuid id PK
        text name UK
        uuid head_user_id FK
        uuid parent_department_id FK
        active_status status
    }

    ASSET_CATEGORIES {
        uuid id PK
        text name UK
        jsonb custom_fields
    }

    ASSETS {
        uuid id PK
        text asset_tag UK "AF-0001, sequence-generated"
        text name
        uuid category_id FK
        text serial_number UK
        asset_condition condition
        boolean is_bookable
        jsonb custom_values
        asset_status status "lifecycle state"
    }

    ALLOCATIONS {
        uuid id PK
        uuid asset_id FK
        uuid holder_user_id FK
        uuid holder_department_id FK
        uuid allocated_by FK
        date expected_return_date
        timestamptz returned_at
        allocation_status status
    }

    TRANSFER_REQUESTS {
        uuid id PK
        uuid asset_id FK
        uuid from_user_id FK
        uuid to_user_id FK
        uuid requested_by FK
        transfer_status status
        uuid approved_by FK
    }

    BOOKINGS {
        uuid id PK
        uuid asset_id FK
        uuid booked_by_user_id FK
        uuid department_id FK
        tstzrange time_range "half-open [start,end)"
        booking_status status
    }

    MAINTENANCE_REQUESTS {
        uuid id PK
        uuid asset_id FK
        uuid raised_by FK
        maintenance_priority priority
        maintenance_status status
        uuid approved_by FK
        text technician_name
    }

    AUDIT_CYCLES {
        uuid id PK
        text name
        uuid scope_department_id FK
        date start_date
        date end_date
        audit_cycle_status status
        uuid created_by FK
        timestamptz closed_at
    }

    AUDIT_ITEMS {
        uuid id PK
        uuid audit_cycle_id FK
        uuid asset_id FK
        text expected_location
        audit_verification verification
        uuid verified_by FK
    }

    NOTIFICATIONS {
        uuid id PK
        uuid recipient_user_id FK "null = broadcast"
        notification_type type
        text message
        boolean is_read
    }

    ACTIVITY_LOGS {
        uuid id PK
        uuid actor_user_id FK
        text action "namespaced, e.g. asset.allocated"
        jsonb metadata
    }
```

#### Crown-jewel constraints

### 4. Authentication & authorization

```mermaid
sequenceDiagram
    participant U as User
    participant Auth as /auth endpoints
    participant Sec as security.py
    participant Dep as deps.py

    U->>Auth: POST /auth/signup {name, email, password}
    Note over Auth: role field ignored/rejected —<br/>signup always creates EMPLOYEE
    Auth->>Sec: bcrypt hash password
    Sec-->>Auth: password_hash
    Auth-->>U: 201 user created (role = EMPLOYEE)

    U->>Auth: POST /auth/login {email, password}
    Auth->>Sec: verify bcrypt hash
    Sec->>Sec: encode JWT {sub: user_id, role, department_id, exp: +8h}
    Sec-->>Auth: access_token
    Auth-->>U: {access_token, token_type, user}

    U->>Dep: any /api/* request with bearer token
    Dep->>Dep: decode JWT, load user, check status == ACTIVE
    Dep-->>U: 401 if invalid/expired/inactive
    Dep->>Dep: require_role(*roles) — 403 if role not in allowed set
    Note over Dep: Department Head scoping is a service-layer<br/>comparison of current_user.department_id,<br/>not a JWT claim check
```

#### Role / permission matrix

### 5. Asset lifecycle

```mermaid
stateDiagram-v2
    [*] --> AVAILABLE: register
    AVAILABLE --> ALLOCATED: allocate
    ALLOCATED --> AVAILABLE: return
    ALLOCATED --> ALLOCATED: transfer approved (holder changes)
    AVAILABLE --> UNDER_MAINTENANCE: maintenance request approved
    UNDER_MAINTENANCE --> AVAILABLE: maintenance resolved
    AVAILABLE --> RETIRED: admin action
    RETIRED --> DISPOSED: admin action
    ALLOCATED --> LOST: audit cycle closed, item = MISSING
    AVAILABLE --> LOST: audit cycle closed, item = MISSING
    UNDER_MAINTENANCE --> LOST: audit cycle closed, item = MISSING
```

#### Related state machines

### 6. Core workflows

#### 6.1 Double allocation & transfer (crown jewel #1)

```mermaid
flowchart TD
    Start(["POST /allocations<br/>{asset_id, holder}"]) --> Check{"Active allocation<br/>exists for asset?"}
    Check -- yes --> Conflict["409 asset_already_allocated<br/>+ current_holder + suggested_action: transfer_request"]
    Check -- no --> Insert["INSERT allocation (ACTIVE)<br/>UPDATE asset.status = ALLOCATED<br/>log + notify holder"]
    Conflict --> Transfer(["POST /transfers<br/>{asset_id, to_user_id}"])
    Transfer --> TReq["INSERT transfer_request (REQUESTED)"]
    TReq --> Approve{"Asset Mgr / Dept Head<br/>approves?"}
    Approve -- reject --> TRej["transfer.status = REJECTED<br/>notify requester"]
    Approve -- approve --> Atomic["Single transaction:<br/>close old allocation (RETURNED)<br/>open new allocation (ACTIVE) to new holder<br/>transfer.status = COMPLETED<br/>log asset.transferred, notify both parties"]
    Insert --> End(["asset.status = ALLOCATED"])
    Atomic --> End
```

#### 6.2 Booking overlap (crown jewel #2)

```mermaid
flowchart TD
    Start(["POST /bookings<br/>{asset_id, start, end}"]) --> Bookable{"asset.is_bookable?"}
    Bookable -- no --> E422["422 — not a bookable asset"]
    Bookable -- yes --> Overlap{"Non-cancelled booking on<br/>this asset with<br/>time_range && requested_range?"}
    Overlap -- yes --> E409["409 booking_overlap<br/>+ conflicting_booking{id,start,end}"]
    Overlap -- no --> Ins["INSERT booking (UPCOMING)<br/>log booking.created<br/>notify BOOKING_CONFIRMED"]
    Ins --> DBConstraint["GIST exclusion constraint re-validates<br/>at commit — final guarantee"]
```

#### 6.3 Maintenance kanban

```mermaid
stateDiagram-v2
    [*] --> PENDING: raise request
    PENDING --> APPROVED: asset_mgr+ approves\n(asset → UNDER_MAINTENANCE)
    PENDING --> REJECTED: asset_mgr+ rejects
    APPROVED --> TECHNICIAN_ASSIGNED: assign technician
    TECHNICIAN_ASSIGNED --> IN_PROGRESS: work starts
    IN_PROGRESS --> RESOLVED: resolved\n(asset → AVAILABLE)
```

#### 6.4 Audit cycle

```mermaid
flowchart TD
    Create(["POST /audit-cycles<br/>(Admin)"]) --> Snapshot["Snapshot in-scope assets<br/>into audit_items (PENDING,<br/>expected_location captured)"]
    Snapshot --> Assign["POST /audit-cycles/{id}/auditors<br/>assign users as auditors"]
    Assign --> Mark["PATCH /audit-items/{id}<br/>assigned auditor (or Admin/Asset Mgr) sets<br/>VERIFIED | MISSING | DAMAGED"]
    Mark --> Close["POST /audit-cycles/{id}/close (Admin)<br/>cycle.status = CLOSED"]
    Close --> Discrepancy["Auto-generate discrepancy report:<br/>every MISSING item → asset.status = LOST<br/>AUDIT_DISCREPANCY notification per discrepancy"]
```

### 8. Deployment architecture

```mermaid
flowchart TB
    subgraph Compose["docker compose up -d --build"]
        direction LR
        subgraph pg["postgres (assetflow-db)"]
            PGV[("pgdata volume")]
        end
        subgraph api["api (assetflow-api)"]
            direction TB
            Mig["alembic upgrade head"]
            Seed["python -m app.seed.seed"]
            Uv["uvicorn --reload"]
            Mig --> Seed --> Uv
        end
        subgraph fe["frontend (assetflow-frontend)"]
            Vite["vite dev --host 0.0.0.0"]
        end
        api -- "depends_on: service_healthy" --> pg
        fe -- "depends_on" --> api
    end

    Dev["Developer machine"] -- "bind mount ./backend:/app<br/>hot reload" --> api
    Dev -- "bind mount ./frontend:/app<br/>(node_modules stays in image)" --> fe
    Browser["localhost:5173"] --> fe
    Browser -. "REST calls" .-> api
    api -- "5432" --> pg
```

> For full architectural explanations and tables, see `docs/ARCHITECTURE.md`.



  
