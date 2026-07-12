# AssetFlow — Design Document

**Enterprise Asset & Resource Management System**
Hackathon build · 8 hours · 4 developers + 1 integration lead
Target implementation agent: Antigravity + Claude Opus

---

## 0. How to read this document

This is the single source of truth for the build. Every table, enum, endpoint, and
conflict rule below is **frozen** and meant to be implemented literally. The four
feature tracks (Section 12) build **against the contracts in this document**, not
against each other's running code, so they can parallelize from minute one without
waiting.

Two rules are the "crown jewels" of this project — the double-allocation block and the
booking-overlap block. They are judged on correctness, and both are enforced **twice**:
once by a Postgres constraint (impossible to violate) and once by an app-layer pre-check
(so the user gets a friendly, informative `409` instead of a raw DB error). Sections 6
and 7 spell them out exactly.

---

## 1. Requirements summary

### Functional (in scope)
- Role-gated account creation (signup → Employee only; roles assigned by Admin later).
- Master data: departments (with hierarchy), asset categories (with custom fields), employee directory.
- Asset registration with auto-generated tags and full lifecycle status.
- Asset allocation + transfer workflow with **double-allocation prevention**.
- Resource booking by time slot with **overlap prevention**.
- Maintenance approval workflow (kanban) that drives asset status.
- Audit cycles with assigned auditors and auto-generated discrepancy reports.
- KPI dashboard, reports/analytics, notifications, activity log.

### Non-functional / constraints
- **Stack:** Python **FastAPI**, **SQLAlchemy 2.0** + **Alembic**, **Pydantic v2**, **PostgreSQL 16**, **Uvicorn**.
- **Auth:** self-rolled JWT (access-token only) + role-check middleware. `passlib[bcrypt]` for hashing, `python-jose` for JWT. **No Supabase/Firebase/managed BaaS. No RLS** — authorization lives in FastAPI dependencies.
- **Deployment:** Docker Compose (`postgres` + `api` services; optional `frontend` service). Runs identically across 4 laptops.
- **Frontend:** built as-is to match the provided Excalidraw mockup; consumes the API below. This doc does not re-spec the UI, but every screen maps to endpoints in Section 11.
- **Single organization** — no multi-tenancy, no tenant isolation logic.
- **No realtime** — clients fetch on load + manual refresh / dashboard poll. No websockets.
- **Photos/documents** — optional URL field only; no upload pipeline.
- **QR** — the Asset Tag *is* the QR payload; search field only, no camera scanning.
- **Notifications** — in-app only, no email.
- **Forgot password** — visible button, stubbed endpoint (returns 200, sends nothing).

### Explicitly out of scope
Purchasing, invoicing, accounting; acquisition cost is stored for ranking/reports only.
Refresh-token rotation, multi-tenancy, email/SMS, file storage, real-time push.

---

## 2. Architecture overview

```
┌──────────────┐        HTTPS/JSON        ┌─────────────────────────────┐
│  Frontend    │  ───────────────────────▶│  FastAPI (uvicorn)          │
│  (mockup)    │◀────────  JWT  ──────────│  routers → services → ORM   │
└──────────────┘                          │  role guards in deps.py     │
                                          └──────────────┬──────────────┘
                                                         │ SQLAlchemy
                                                         ▼
                                          ┌─────────────────────────────┐
                                          │  PostgreSQL 16              │
                                          │  + btree_gist extension     │
                                          │  conflict rules as          │
                                          │  constraints (last line of  │
                                          │  defense)                   │
                                          └─────────────────────────────┘
```

**Layering (enforced by folder, see Section 12):**
`routers/` (HTTP + auth guard, thin) → `services/` (business logic, all conflict rules,
transactions) → `models/` (SQLAlchemy) + `schemas/` (Pydantic). Routers never touch the
ORM directly; services never touch `Request`/`Response`.

**Repo layout (frozen — ownership in Section 12):**
```
assetflow/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/
│   └── app/
│       ├── main.py            # app factory, router registration ONLY
│       ├── config.py          # settings from env
│       ├── db.py              # engine, SessionLocal, get_db()
│       ├── security.py        # hashing, JWT encode/decode
│       ├── deps.py            # get_current_user, require_role(...)
│       ├── models/            # one file per entity
│       ├── schemas/           # one file per module
│       ├── routers/           # one file per module
│       ├── services/          # one file per module (business logic)
│       └── seed/
│           └── seed.py        # simulation data generator (Section 13)
└── frontend/                  # built to mockup, consumes API
```

Registering routers in `main.py` is the one shared write point; keep it to
`app.include_router(...)` lines only, one per module, alphabetized, so merges are trivial.

---

## 3. Data model

Naming: snake_case tables (plural), `id` UUID primary keys (`gen_random_uuid()`),
`created_at`/`updated_at` timestamptz on every table. All enums are **Postgres enum types**
mirrored by Python `str, Enum` classes with identical values.

### 3.1 Enums (frozen values)

| Enum | Values |
|---|---|
| `user_role` | `ADMIN`, `ASSET_MANAGER`, `DEPARTMENT_HEAD`, `EMPLOYEE` |
| `active_status` | `ACTIVE`, `INACTIVE` |
| `asset_status` | `AVAILABLE`, `ALLOCATED`, `RESERVED`, `UNDER_MAINTENANCE`, `LOST`, `RETIRED`, `DISPOSED` |
| `asset_condition` | `NEW`, `GOOD`, `FAIR`, `POOR` |
| `allocation_status` | `ACTIVE`, `RETURNED` |
| `transfer_status` | `REQUESTED`, `APPROVED`, `REJECTED`, `COMPLETED` |
| `booking_status` | `UPCOMING`, `ONGOING`, `COMPLETED`, `CANCELLED` |
| `maintenance_status` | `PENDING`, `APPROVED`, `REJECTED`, `TECHNICIAN_ASSIGNED`, `IN_PROGRESS`, `RESOLVED` |
| `maintenance_priority` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `audit_cycle_status` | `OPEN`, `CLOSED` |
| `audit_verification` | `PENDING`, `VERIFIED`, `MISSING`, `DAMAGED` |
| `notification_type` | `ASSET_ASSIGNED`, `MAINTENANCE_APPROVED`, `MAINTENANCE_REJECTED`, `BOOKING_CONFIRMED`, `BOOKING_CANCELLED`, `BOOKING_REMINDER`, `TRANSFER_APPROVED`, `OVERDUE_RETURN`, `AUDIT_DISCREPANCY` |

### 3.2 Tables

**users** — an employee *is* a user; the employee directory is a view over this table.
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text not null | |
| email | citext unique not null | login identity |
| password_hash | text not null | bcrypt |
| role | user_role not null default `EMPLOYEE` | **signup always writes EMPLOYEE**; changed only via directory promotion |
| department_id | uuid fk → departments.id null | |
| status | active_status not null default `ACTIVE` | |
| created_at, updated_at | timestamptz | |

**departments**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text unique not null | |
| head_user_id | uuid fk → users.id null | Department Head |
| parent_department_id | uuid fk → departments.id null | hierarchy (self-ref) |
| status | active_status not null default `ACTIVE` | |
| created_at, updated_at | | |

**asset_categories**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text unique not null | Electronics, Furniture, Vehicles… |
| custom_fields | jsonb not null default `'{}'` | field schema, e.g. `{"warranty_months":"int"}` |
| created_at, updated_at | | |

**assets**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| asset_tag | text unique not null | auto `AF-0001` (Section 5) |
| name | text not null | |
| category_id | uuid fk → asset_categories.id not null | |
| serial_number | text unique null | |
| acquisition_date | date null | |
| acquisition_cost | numeric(12,2) null | reports/ranking only |
| condition | asset_condition not null default `GOOD` | |
| location | text null | |
| photo_url | text null | stub |
| is_bookable | boolean not null default false | "shared/bookable" flag; a room is an asset with this true |
| custom_values | jsonb not null default `'{}'` | values for the category's custom_fields |
| status | asset_status not null default `AVAILABLE` | lifecycle (Section 4) |
| created_at, updated_at | | |

**allocations**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| asset_id | uuid fk → assets.id not null | |
| holder_user_id | uuid fk → users.id null | employee holding it |
| holder_department_id | uuid fk → departments.id null | dept allocation (one of the two holder cols set) |
| allocated_by | uuid fk → users.id not null | |
| allocated_at | timestamptz not null default now() | |
| expected_return_date | date null | overdue = date < today AND status ACTIVE |
| returned_at | timestamptz null | |
| return_condition_notes | text null | |
| status | allocation_status not null default `ACTIVE` | |

> **DB constraint (crown jewel #1):**
> `CREATE UNIQUE INDEX one_active_allocation_per_asset ON allocations (asset_id) WHERE returned_at IS NULL;`
> Guarantees at most one open allocation per asset. See Section 6.

**transfer_requests**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| asset_id | uuid fk not null | |
| from_user_id | uuid fk → users.id not null | current holder |
| to_user_id | uuid fk → users.id not null | requested new holder |
| requested_by | uuid fk → users.id not null | |
| reason | text null | |
| status | transfer_status not null default `REQUESTED` | |
| approved_by | uuid fk → users.id null | |
| created_at, resolved_at | timestamptz | |

**bookings**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| asset_id | uuid fk not null | must reference an asset with is_bookable = true (checked in service) |
| booked_by_user_id | uuid fk → users.id not null | |
| department_id | uuid fk → departments.id null | dept booking |
| time_range | tstzrange not null | `[start, end)` |
| status | booking_status not null default `UPCOMING` | CANCELLED persisted; UPCOMING/ONGOING/COMPLETED derived from time_range vs now at read time |
| created_at, updated_at | | |

> **DB constraint (crown jewel #2):**
> `CREATE EXTENSION IF NOT EXISTS btree_gist;`
> `ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings EXCLUDE USING gist (asset_id WITH =, time_range WITH &&) WHERE (status <> 'CANCELLED');`
> Makes overlapping bookings for the same asset physically impossible. See Section 7.

**maintenance_requests**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| asset_id | uuid fk not null | |
| raised_by | uuid fk → users.id not null | |
| issue_description | text not null | |
| priority | maintenance_priority not null default `MEDIUM` | |
| photo_url | text null | stub |
| status | maintenance_status not null default `PENDING` | drives asset status (Section 4) |
| approved_by | uuid fk → users.id null | |
| technician_name | text null | free-text (no technician entity in MVP) |
| created_at, resolved_at | timestamptz | |

**audit_cycles**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text not null | e.g. "Q3 audit: Engineering" |
| scope_department_id | uuid fk null | |
| scope_location | text null | |
| start_date, end_date | date | |
| status | audit_cycle_status not null default `OPEN` | |
| created_by | uuid fk → users.id not null | |
| created_at, closed_at | timestamptz | |

**audit_cycle_auditors** (join)
| column | type | notes |
|---|---|---|
| audit_cycle_id | uuid fk not null | |
| user_id | uuid fk → users.id not null | pk = (audit_cycle_id, user_id) |

**audit_items**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| audit_cycle_id | uuid fk not null | |
| asset_id | uuid fk not null | |
| expected_location | text null | snapshot of asset.location at cycle creation |
| verification | audit_verification not null default `PENDING` | |
| verified_by | uuid fk → users.id null | |
| verified_at | timestamptz null | |
| notes | text null | |

**notifications**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| recipient_user_id | uuid fk → users.id null | null = broadcast |
| type | notification_type not null | |
| message | text not null | |
| entity_type | text null | e.g. "asset","booking" |
| entity_id | uuid null | |
| is_read | boolean not null default false | |
| created_at | timestamptz | |

**activity_logs**
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| actor_user_id | uuid fk → users.id not null | |
| action | text not null | e.g. "asset.allocated" |
| entity_type | text null | |
| entity_id | uuid null | |
| metadata | jsonb not null default `'{}'` | |
| created_at | timestamptz | |

### 3.3 Relationship map
```
departments ──head──▶ users            departments ──parent──▶ departments (self)
users ──department──▶ departments
asset_categories ──1:N──▶ assets
assets ──1:N──▶ allocations, bookings, maintenance_requests, audit_items, transfer_requests
audit_cycles ──1:N──▶ audit_items ;  audit_cycles ──M:N (auditors)──▶ users
users ──1:N──▶ notifications, activity_logs
```

---

## 4. Asset lifecycle state machine

The `assets.status` field is driven by the workflows, never edited freely (except admin
retire/dispose). Allowed transitions:

```
                 allocate                     return
   AVAILABLE ───────────────▶ ALLOCATED ───────────────▶ AVAILABLE
       │  ▲                                                   ▲
 approve│  │resolve                        transfer approved  │
 mainten.│  │mainten.        (re-allocates, stays ALLOCATED)  │
       ▼  │                                                   │
 UNDER_MAINTENANCE                                            │
                                                              │
   AVAILABLE ──reserve (future booking, optional)──▶ RESERVED ┘

   any status ──audit close: item MISSING──▶ LOST
   AVAILABLE ──admin──▶ RETIRED ──admin──▶ DISPOSED
```

**Who/what triggers each transition:**
| From | To | Trigger | Service |
|---|---|---|---|
| AVAILABLE | ALLOCATED | allocation created | allocation |
| ALLOCATED | AVAILABLE | return recorded | allocation |
| ALLOCATED | ALLOCATED | transfer approved (holder changes) | transfer |
| AVAILABLE | UNDER_MAINTENANCE | maintenance request **approved** | maintenance |
| UNDER_MAINTENANCE | AVAILABLE | maintenance **resolved** | maintenance |
| any | LOST | audit cycle closed, item = MISSING | audit |
| AVAILABLE | RETIRED / DISPOSED | admin action | assets |
| AVAILABLE | RESERVED | optional: future-dated booking created (see note) | booking |

> **RESERVED note:** to keep MVP simple, bookable assets (rooms/vehicles) stay `AVAILABLE`
> at the asset level and their availability is expressed purely through the `bookings`
> table. `RESERVED` is only used if you choose to reserve a *non-bookable* asset for a
> pending allocation. If time is short, **do not implement RESERVED transitions** — leave
> the enum value present but unused. This is the safe cut.

**Other state machines:**
- Allocation: `ACTIVE → RETURNED`.
- Transfer: `REQUESTED → APPROVED → COMPLETED`; `REQUESTED → REJECTED`.
- Booking: temporal `UPCOMING → ONGOING → COMPLETED` (derived); explicit `→ CANCELLED`.
- Maintenance: `PENDING → APPROVED → TECHNICIAN_ASSIGNED → IN_PROGRESS → RESOLVED`; `PENDING → REJECTED`.
- Audit cycle: `OPEN → CLOSED` (one-way). Audit item: `PENDING → VERIFIED | MISSING | DAMAGED`.

---

## 5. Asset tag generation

Format `AF-####`, zero-padded to 4, monotonic. Implement with a dedicated Postgres
sequence so concurrent registers never collide:
```
CREATE SEQUENCE asset_tag_seq START 1;
-- on insert (service layer): tag = 'AF-' || lpad(nextval('asset_tag_seq')::text, 4, '0')
```
Generate the tag in the asset service inside the same transaction as the insert. Do **not**
compute `max(tag)+1` in Python (race condition, and ugly under seeding).

---

## 6. Crown jewel #1 — double-allocation block

**Rule:** an asset with an active allocation cannot be allocated again. Attempting it must
return a friendly error naming the current holder and offering transfer.

**Enforcement layers:**
1. **DB:** partial unique index `one_active_allocation_per_asset` (Section 3.2). Final guarantee.
2. **Service pre-check** (`allocation_service.allocate`):
   - `SELECT` the current `ACTIVE` allocation for `asset_id`.
   - If one exists → raise `409 Conflict` with body:
     ```json
     {
       "error": "asset_already_allocated",
       "message": "Currently held by Priya Shah (Engineering).",
       "current_holder": { "user_id": "...", "name": "Priya Shah", "department": "Engineering" },
       "suggested_action": "transfer_request"
     }
     ```
   - Else → within one transaction: insert allocation (`ACTIVE`), set `asset.status = ALLOCATED`, write activity log `asset.allocated`, create `ASSET_ASSIGNED` notification to the holder.

**Return flow** (`allocation_service.return_asset`): set `returned_at = now()`,
`status = RETURNED`, capture `return_condition_notes`, set `asset.status = AVAILABLE`, log,
notify. This frees the partial index so the asset can be allocated again.

**Transfer flow** (`transfer_service`):
- `create`: only allowed when asset is currently allocated to `from_user`. Insert `REQUESTED`.
- `approve` (Asset Manager, or Department Head scoped to their dept): in one transaction —
  close the `from_user` allocation (`RETURNED`), open a new allocation to `to_user`
  (`ACTIVE`), set transfer `COMPLETED`, append to allocation history, log `asset.transferred`,
  notify both parties (`TRANSFER_APPROVED`).
- `reject`: set `REJECTED`, notify requester.

---

## 7. Crown jewel #2 — booking overlap block

**Rule:** two bookings for the same bookable asset may not overlap in time. Example from the
brief: B2 booked 09:00–10:00 → 09:30–10:30 is **rejected**, 10:00–11:00 is **accepted**
(ranges are half-open `[start, end)`, so touching endpoints don't conflict).

**Enforcement layers:**
1. **DB:** `EXCLUDE USING gist (asset_id WITH =, time_range WITH &&) WHERE status <> 'CANCELLED'` (Section 3.2). `btree_gist` extension required. Final guarantee, and it gives you the half-open semantics for free.
2. **Service pre-check** (`booking_service.create`):
   - Verify `asset.is_bookable = true` → else `422`.
   - Query for any non-cancelled booking on that asset whose `time_range && requested_range`.
   - If found → `409 Conflict`:
     ```json
     {
       "error": "booking_overlap",
       "message": "Slot unavailable — overlaps an existing booking.",
       "conflicting_booking": { "id": "...", "start": "...", "end": "..." }
     }
     ```
   - Else → insert (`UPCOMING`), log `booking.created`, notify `BOOKING_CONFIRMED`.

**Cancel / reschedule:** cancel sets `status = CANCELLED` (frees the exclusion constraint);
reschedule = cancel-then-create in one transaction, re-running the overlap check.
**Reminder:** `BOOKING_REMINDER` notification generated for upcoming bookings (see Section 9,
"derived notifications").

**Calendar read:** `GET /bookings?asset_id=&date=` returns the day's bookings with derived
temporal status computed as: `now < start → UPCOMING`, `start ≤ now < end → ONGOING`,
`now ≥ end → COMPLETED`, unless persisted `CANCELLED`.

---

## 8. Authentication & authorization

**Signup** creates an `EMPLOYEE` — the request body cannot set a role; ignore/reject any
`role` field. **Login** returns a JWT access token; claims: `sub` (user_id), `role`,
`department_id`, `exp` (e.g. 8h — long enough for the whole hackathon session). No refresh
token. Passwords bcrypt-hashed. `/auth/forgot-password` is a stub (200, no-op).

**Authorization** is FastAPI dependencies in `deps.py`, not RLS:
```
get_current_user(token)      -> decodes JWT, loads user, 401 on failure/inactive
require_role(*roles)         -> 403 unless current_user.role in roles
require_same_department(...)  -> for Department Head scoping (compares dept_id)
```
Attach guards per-route (Section 11). Role scoping for Department Head (e.g. "approve
transfers within their department") is enforced in the service by comparing the asset's
current holder department / the request's department against `current_user.department_id`.

### 8.1 Role / permission matrix
`✔` = allowed; `dept` = allowed only within own department; `own` = only own records.

| Action | Admin | Asset Mgr | Dept Head | Employee |
|---|:--:|:--:|:--:|:--:|
| Signup (self) | — | — | — | ✔ |
| Manage departments | ✔ | | | |
| Manage categories | ✔ | | | |
| View employee directory | ✔ | ✔ | dept | |
| **Promote/demote roles, set user status** | ✔ | | | |
| Create audit cycle / assign auditors / close | ✔ | | | |
| View org-wide analytics | ✔ | ✔ | dept | |
| Register / edit asset | ✔ | ✔ | | |
| Retire / dispose asset | ✔ | ✔ | | |
| Allocate asset | ✔ | ✔ | dept | |
| Approve return + condition notes | ✔ | ✔ | dept | |
| Initiate transfer/return request | ✔ | ✔ | dept | own |
| Approve transfer | ✔ | ✔ | dept | |
| Raise maintenance request | ✔ | ✔ | ✔ | ✔ |
| Approve/reject maintenance, assign tech, progress, resolve | ✔ | ✔ | | |
| Book / cancel resource | ✔ | ✔ | dept | ✔ |
| Perform audit verification (mark item) | ✔ | ✔ | assigned auditor | assigned auditor |
| View own allocations / notifications | ✔ | ✔ | ✔ | ✔ |
| View activity log | ✔ | ✔ | dept | own |

> Any employee can be *assigned as an auditor* to a cycle regardless of base role; auditing
> rights on a cycle come from `audit_cycle_auditors`, checked in the audit service.

---

## 9. Notifications & activity log (derived vs. event)

**Event notifications** are written synchronously by the service that causes them:
`ASSET_ASSIGNED`, `TRANSFER_APPROVED`, `MAINTENANCE_APPROVED/REJECTED`,
`BOOKING_CONFIRMED/CANCELLED`, `AUDIT_DISCREPANCY`.

**Derived notifications** (`OVERDUE_RETURN`, `BOOKING_REMINDER`) are computed, since there's
no scheduler in MVP. Implement a single idempotent function
`notifications_service.sync_derived()` that:
- finds allocations with `status ACTIVE AND expected_return_date < today` lacking an unread
  `OVERDUE_RETURN` notification, and creates them;
- finds `UPCOMING` bookings starting within the next N minutes lacking a `BOOKING_REMINDER`,
  and creates them.

Call `sync_derived()` at the top of `GET /dashboard` and `GET /notifications` so the demo
always shows live overdue/reminder items without a cron job.

**Activity log**: every state-changing service writes one `activity_logs` row
(`actor`, `action`, `entity`, `metadata`). Keep action strings namespaced and stable
(`asset.registered`, `asset.allocated`, `asset.returned`, `asset.transferred`,
`booking.created`, `booking.cancelled`, `maintenance.raised`, `maintenance.approved`,
`maintenance.resolved`, `audit.cycle_closed`, `user.role_changed`, …).

---

## 10. Dashboard KPIs

`GET /dashboard` returns (all scoped to viewer's permissions):
- `assets_available`, `assets_allocated` (counts by status)
- `maintenance_today` (maintenance requests approved/created today or currently `UNDER_MAINTENANCE`)
- `active_bookings` (bookings whose range spans now)
- `pending_transfers` (transfer_requests `REQUESTED`)
- `upcoming_returns` (allocations with `expected_return_date` in next 7 days, not overdue)
- `overdue_returns` (allocations `expected_return_date < today` — **listed separately/highlighted**)
- `recent_activity` (latest N activity_logs)

Call `notifications_service.sync_derived()` first so overdue counts are fresh.

---

## 11. API surface

Base path `/api`. All non-auth routes require `get_current_user`. Bodies/responses are
Pydantic. Standard errors: `401` (no/bad token), `403` (role), `404`, `409` (conflict rules),
`422` (validation). Pagination via `?limit=&offset=` on list endpoints.

### Auth
| Method | Path | Guard | Notes |
|---|---|---|---|
| POST | `/auth/signup` | public | creates EMPLOYEE only |
| POST | `/auth/login` | public | → `{access_token, token_type, user}` |
| POST | `/auth/forgot-password` | public | **stub**, 200 |
| GET | `/auth/me` | user | current user profile |

### Organization setup (Admin)
| Method | Path | Guard |
|---|---|---|
| GET/POST | `/departments` | GET: mgr+ · POST: admin |
| PATCH/DELETE | `/departments/{id}` | admin (DELETE = deactivate) |
| GET/POST | `/categories` | GET: mgr+ · POST: admin |
| PATCH | `/categories/{id}` | admin |
| GET | `/employees` | mgr+ (dept-scoped for head) |
| PATCH | `/employees/{id}` | admin — set `role`, `department_id`, `status` (**only place roles change**) |

### Assets
| Method | Path | Guard | Notes |
|---|---|---|---|
| POST | `/assets` | asset_mgr+ | auto tag; enters `AVAILABLE` |
| GET | `/assets` | user | filters: `q` (tag/serial/QR), `category_id`, `status`, `department_id`, `location`, `is_bookable` |
| GET | `/assets/{id}` | user | includes allocation + maintenance history |
| PATCH | `/assets/{id}` | asset_mgr+ | edit fields; retire/dispose via `status` (guarded transitions) |

### Allocation & transfer
| Method | Path | Guard | Notes |
|---|---|---|---|
| POST | `/allocations` | asset_mgr+ / head(dept) | **double-alloc check → 409** (Section 6) |
| POST | `/allocations/{id}/return` | asset_mgr+ / head(dept) | condition notes; → AVAILABLE |
| GET | `/allocations` | user | filters incl. `overdue=true`, `holder_user_id` |
| POST | `/transfers` | user(own)+ | requires asset currently allocated to `from` |
| GET | `/transfers` | mgr+/head(dept) | list `REQUESTED` etc. |
| POST | `/transfers/{id}/approve` | asset_mgr+ / head(dept) | atomic re-allocation |
| POST | `/transfers/{id}/reject` | asset_mgr+ / head(dept) | |

### Bookings
| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/bookings` | user | `?asset_id=&date=` calendar; derived temporal status |
| POST | `/bookings` | user+ | **overlap check → 409** (Section 7); asset must be bookable |
| POST | `/bookings/{id}/cancel` | owner / mgr+ | |
| POST | `/bookings/{id}/reschedule` | owner / mgr+ | cancel+create, re-check overlap |

### Maintenance
| Method | Path | Guard | Notes |
|---|---|---|---|
| POST | `/maintenance` | user+ | raise request (`PENDING`) |
| GET | `/maintenance` | user | kanban list, groupable by status |
| POST | `/maintenance/{id}/transition` | body `{to_status, technician_name?}` | asset_mgr+; validates allowed transition; `APPROVED`→asset UNDER_MAINTENANCE, `RESOLVED`→asset AVAILABLE |

### Audit
| Method | Path | Guard | Notes |
|---|---|---|---|
| POST | `/audit-cycles` | admin | snapshots in-scope assets into `audit_items` (`PENDING`, expected_location filled) |
| POST | `/audit-cycles/{id}/auditors` | admin | assign auditors |
| GET | `/audit-cycles` / `/audit-cycles/{id}` | mgr+/auditor | |
| PATCH | `/audit-items/{id}` | assigned auditor | set `VERIFIED\|MISSING\|DAMAGED` + notes |
| POST | `/audit-cycles/{id}/close` | admin | locks cycle; `MISSING`→asset `LOST`; auto-creates discrepancy report + `AUDIT_DISCREPANCY` notifications |
| GET | `/audit-cycles/{id}/discrepancies` | mgr+ | flagged items (auto-generated report) |

### Reports
| Method | Path | Guard | Returns |
|---|---|---|---|
| GET | `/reports/utilization` | mgr+ | allocation ratio by department |
| GET | `/reports/most-used` / `/reports/idle` | mgr+ | ranked by booking/allocation count vs. idle days |
| GET | `/reports/maintenance-frequency` | mgr+ | count by asset/category |
| GET | `/reports/due` | mgr+ | due-for-maintenance / nearing-retirement |
| GET | `/reports/booking-heatmap` | mgr+ | counts per weekday×hour bucket |
| GET | `/reports/export` | mgr+ | CSV of a chosen report |

### Notifications & logs
| Method | Path | Guard |
|---|---|---|
| GET | `/notifications` | user (filter `?type=`; calls `sync_derived()`) |
| POST | `/notifications/{id}/read` | user |
| GET | `/activity-logs` | mgr+/dept/own |

### Dashboard
| Method | Path | Guard |
|---|---|---|
| GET | `/dashboard` | user |

---

## 12. Team division (4 devs + you on integration)

**You** own `main`, `main.py` router registration, `db.py`, `config.py`, the migration merge
order, Docker Compose orchestration, the seed script wiring, and the demo. Everyone else
works on a **feature branch per track** and opens PRs to you; you integrate.

### Parallelization protocol
The DB schema and API contracts in this doc are **frozen at kickoff**. That's what lets four
people build simultaneously without blocking:
1. **First 45 min — everyone together:** you land the skeleton on `main`: repo layout, `db.py`,
   `security.py`, `deps.py` (with `get_current_user` + `require_role`), the **full Alembic
   migration** for every table/enum/constraint in Section 3 (write it once, from this doc),
   and an empty router file per module registered in `main.py`. Push. Now every table and
   guard exists; tracks branch from here.
2. **Contract-first:** because request/response shapes are in Sections 6–11, each track can
   stub its endpoints returning fixed shapes immediately, then fill in services.
3. **File ownership below is disjoint** — each track edits only its own `models/*.py` (already
   in the shared migration, so models are read-mostly), `schemas/<module>.py`,
   `routers/<module>.py`, `services/<module>.py`. The only shared file is `main.py`, touched
   only to add one `include_router` line per module (do this in step 1 to avoid later merges).

### Tracks

**Track A — Auth + Organization Setup + Employee Directory** (Screens 1, 3)
Owns: `routers/auth.py`, `services/auth_service.py`, `routers/org.py`,
`services/org_service.py`, `schemas/auth.py`, `schemas/org.py`.
Delivers: signup/login/me/forgot stub, JWT issuance, departments/categories CRUD, employee
directory + **role promotion / status** (the only role-write path). Because auth + `deps.py`
gate everyone, this track pairs with you in step 1 and finishes `deps.py` first.

**Track B — Assets + Allocation + Transfer** (Screens 4, 5) — *owns crown jewel #1*
Owns: `routers/assets.py`, `routers/allocation.py`, `services/asset_service.py`,
`services/allocation_service.py`, `services/transfer_service.py`, related schemas.
Delivers: asset register (tag sequence), search/filter, detail+history, allocate with
double-alloc 409, return, transfer request→approve/reject re-allocation, overdue flagging.

**Track C — Booking + Maintenance** (Screens 6, 7) — *owns crown jewel #2*
Owns: `routers/booking.py`, `routers/maintenance.py`, `services/booking_service.py`,
`services/maintenance_service.py`, related schemas.
Delivers: calendar read, booking create with overlap 409, cancel/reschedule, maintenance
raise + transition state machine driving asset status, kanban list grouping.

**Track D — Audit + Reports + Notifications + Logs + Dashboard** (Screens 2, 8, 9, 10)
Owns: `routers/audit.py`, `routers/reports.py`, `routers/notifications.py`,
`routers/dashboard.py`, matching services + schemas, plus `services/notifications_service.py`
(`sync_derived`) and `services/activity_service.py` (a `log(actor, action, entity)` helper
the **other tracks import** — publish its signature in step 1 so B and C can call it).
Delivers: audit cycle create/auditors/mark/close→discrepancy report + asset `LOST`, all
report aggregations + CSV export, notifications feed, activity log, dashboard KPIs.

### Cross-track shared helpers (define signatures in step 1, freeze them)
- `activity_service.log(db, actor_id, action, entity_type=None, entity_id=None, metadata=None)` — Track D writes it; B, C, A call it.
- `notifications_service.create(db, recipient_id, type, message, entity_type, entity_id)` — Track D writes; all call it.
Publishing these two signatures up front removes the only real coupling between tracks.

### Merge protocol
Small, frequent PRs into `main`. You rebase/merge. Migrations are already unified (step 1),
so no migration conflicts. If a shared helper signature must change, it changes on `main`
and everyone rebases. Keep `routers/__init__.py` and `main.py` append-only.

---

## 13. Simulation data — spec for the coding agent

You will generate the seed later with the agent. This section is the **spec it must follow**.
Put the generator in `backend/app/seed/seed.py`, runnable via
`docker compose run --rm api python -m app.seed.seed`, **idempotent** (safe to re-run: upsert
by natural key / truncate-then-insert behind a `--reset` flag), and **deterministic**
(seed the RNG, e.g. `random.seed(42)`).

**Timestamps must be relative to `now()`**, not hard-coded dates, so overdue/upcoming/ongoing
items stay correct whenever the demo runs. Use offsets like `now - 5 days`, `now + 2 hours`.

**Required records (make every screen look alive):**

- **Users / roles:** 1 Admin (`admin@assetflow.io` / known demo password), 2 Asset Managers,
  4 Department Heads, ~15 Employees. Include **Priya Shah** and **Raj** (or "Arjun Nair") as
  named employees for the double-allocation demo. All passwords bcrypt-hashed; print the demo
  login table at the end of the seed run.
- **Departments (5):** Engineering, Facilities, Field Ops, IT, Admin. Give one a parent
  (e.g. "Field Ops (East)" → parent "Field Ops") to exercise hierarchy. Assign heads. One
  `INACTIVE` department to show status filtering.
- **Categories (5):** Electronics (`custom_fields: {warranty_months}`),
  Vehicles (`{registration_no}`), Furniture, Equipment, Spaces (rooms are bookable assets).
- **Assets (~50):** tags `AF-0001…` via the sequence. Distribution: ~55% `AVAILABLE`,
  ~25% `ALLOCATED`, ~8% `UNDER_MAINTENANCE`, ~4% `RESERVED` (only if you implement it, else 0),
  1–2 `LOST`, 1 `RETIRED`, 1 `DISPOSED`. Spread across all categories, with plausible
  `location`, `condition`, `acquisition_date`/`cost`. Mark ~5 as `is_bookable=true` including a
  **"Conference Room B2"** and a couple of vehicles.
  - **Anchor the demo:** create **Laptop `AF-0114` allocated to Priya Shah / Engineering,
    status ALLOCATED** so the double-allocation attempt in the demo hits the block.
- **Allocations:** the active ones matching the ~25% allocated assets. Include **2–3
  overdue** ones (`expected_return_date = now - {2,5,9} days`, still `ACTIVE`) so the
  dashboard "overdue returns" and `OVERDUE_RETURN` notifications populate. Include some
  historical `RETURNED` allocations (with condition notes) so asset history/allocation-history
  screens aren't empty.
- **Transfer requests:** 1–2 in `REQUESTED` state (feeds "pending transfers" KPI), 1 already
  `COMPLETED` (history).
- **Bookings:** for Conference Room B2, seed an existing booking **09:00–10:00 today** so the
  overlap demo (request 09:30–10:30 → rejected) works live. Add a handful of other
  upcoming/ongoing/completed bookings across bookable assets to fill the calendar and the
  booking heatmap.
- **Maintenance requests:** at least one card in **each** kanban column — `PENDING`,
  `APPROVED`, `TECHNICIAN_ASSIGNED`, `IN_PROGRESS`, `RESOLVED` — plus one `REJECTED`. The
  `APPROVED`/`IN_PROGRESS`/`TECHNICIAN_ASSIGNED` ones should reference assets that are
  correspondingly `UNDER_MAINTENANCE`.
- **Audit:** one **OPEN** cycle ("Q3 audit: Engineering, 1–15 Jul") scoped to Engineering,
  2–3 assigned auditors, `audit_items` snapshotted from in-scope assets with a mix of
  `PENDING`/`VERIFIED`, plus at least one `MISSING` and one `DAMAGED` so the discrepancy
  report has content. Also seed one already-`CLOSED` cycle for history.
- **Notifications:** seed the examples visible in Screen 10 (asset assigned, maintenance
  approved, booking confirmed, transfer approved, overdue return, audit discrepancy) with
  realistic relative timestamps and mixed read/unread.
- **Activity logs:** ~30 entries across actors/actions with relative timestamps, matching the
  seeded state changes.

**Consistency invariants the seed must satisfy** (assert these at the end of the script):
- every `ALLOCATED` asset has exactly one `ACTIVE` allocation; every `AVAILABLE` asset has
  zero;
- every `UNDER_MAINTENANCE` asset has an open maintenance request in an appropriate status;
- no two non-cancelled bookings overlap on the same asset (the DB constraint will reject it
  anyway — rely on that as a correctness check);
- overdue allocations have `expected_return_date < today` and `status = ACTIVE`.

---

## 14. Demo script (≈5 min, hits every judged rule)

1. **Login** as Admin → dashboard shows live KPIs incl. **overdue returns highlighted**.
2. **Org setup:** show departments (incl. hierarchy + inactive), a category with a custom
   field, then **promote an Employee to Asset Manager** in the directory — prove roles aren't
   self-assigned.
3. **Register an asset** → auto tag `AF-00xx`, enters `AVAILABLE`.
4. **Double-allocation (crown jewel #1):** try to allocate **Laptop AF-0114** (held by Priya)
   to Raj → blocked with "currently held by Priya Shah (Engineering)" → click **Transfer
   Request** → approve as Asset Manager → history updates, holder changes.
5. **Booking overlap (crown jewel #2):** open **Conference Room B2**, request **09:30–10:30**
   → rejected (overlaps 09:00–10:00) → request **10:00–11:00** → accepted.
6. **Maintenance:** raise a request → approve → watch the asset flip to **Under Maintenance**
   and the card move across the kanban → resolve → back to **Available**.
7. **Audit:** open the Q3 cycle, mark an item **Missing** → **Close cycle** → auto discrepancy
   report + the asset becomes **Lost** + `AUDIT_DISCREPANCY` notification appears.
8. **Reports & notifications:** show utilization/idle/heatmap and the live notifications feed
   (overdue return + everything you just did).

---

## 15. Docker Compose (shape)

```
services:
  postgres:
    image: postgres:16
    environment: POSTGRES_USER/PASSWORD/DB
    volumes: pgdata + init script enabling extensions (pgcrypto for gen_random_uuid, btree_gist, citext)
    healthcheck: pg_isready
  api:
    build: ./backend
    depends_on: postgres (healthy)
    command: alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000
    environment: DATABASE_URL, JWT_SECRET, JWT_EXPIRE_HOURS
    ports: 8000:8000
  # optional:
  frontend:
    build: ./frontend
    ports: 5173:5173
```
The postgres init step must `CREATE EXTENSION IF NOT EXISTS pgcrypto, btree_gist, citext;`
(the Alembic migration can also do this in its first revision — do it in **one** place,
recommended: the first Alembic revision, so a fresh DB is fully set up by `alembic upgrade head`).

---

## 16. Assumptions & things to revisit if time allows

- **RESERVED** asset state is defined but optional; safe to skip (Section 4).
- **Technician** is free-text, not an entity — fine for MVP; promote to a table only if reports need it.
- Reports return JSON aggregates; charts are the frontend's job (mockup shows bar/line). CSV export is the only "export."
- `sync_derived()` replaces a scheduler; acceptable because there's no realtime requirement.
- Department-Head scoping is enforced in services by department comparison, not RLS — matches the "no RLS" constraint.
- Single JWT secret, 8h expiry, no refresh — acceptable for a hackathon session only.
