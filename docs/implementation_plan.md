# AssetFlow — Spec-Driven Implementation Plan

**Enterprise Asset & Resource Management System**
Hackathon build · 8 hours · 4 developers + 1 integration lead
Source of truth: `design.md` (frozen)

---

## How This Plan Works

This plan is organized into **7 sequential stages** (0 through 6). Each stage has tasks, tests, and acceptance criteria that a coding agent must satisfy before the work is merged.

### Team Note

- **Stages 0, 1, 6** → Integration Lead (you — Omm)
- **Stages 2, 3, 4** → One stage per teammate (3 members). The track assignment table is at the end of this document.
- **Stage 5** → Integration Lead (Seed & Frontend)
- All stages are written as if a **single developer** is executing them. The parallelism comes from Stages 2–4 being independent tracks branching from Stage 1's completion.

### Conventions

- **Source of truth**: `design.md` Sections 3–13. Do NOT invent tables, endpoints, enums, or transitions.
- **Layering**: `routers/` → `services/` → `models/` + `schemas/`. Routers never touch ORM. Services never touch `Request`/`Response`.
- **File ownership**: Each stage edits only its own disjoint file set. Shared files (`main.py`, `db.py`, `config.py`, `deps.py`, Alembic migration) are written exclusively in Stage 0.
- **Branch protocol**: Each stage works on `feature/<stage-name>` → PR to `main` → Integration lead merges.
- **No RLS, no Supabase, no BaaS**. Auth is self-rolled JWT + FastAPI deps.
- **Seed timestamps**: Always relative to `now()`, never hardcoded dates.

### Frontend Reference

The frontend is built to match the Excalidraw mockup image (`AssetFlow - Enterprise Asset & Resource Management System - 8 hours.png`). It consists of 10 screens:
1. Login/Signup, 2. Dashboard, 3. Organization Setup (Admin), 4. Asset Registry & Directory, 5. Asset Allocation & Transfer, 6. Resource Booking, 7. Maintenance Kanban, 8. Asset Audit, 9. Reports & Analytics, 10. Activity Logs & Notifications

---

## Stage 0 — Skeleton & Foundation (Integration Lead)

> **Owner**: Integration Lead
> **Branch**: `main` (direct push)
> **Duration**: ~45 min
> **Dependency**: None

### Purpose

Land the complete repo scaffold, full DB schema migration, auth guard signatures, Docker Compose, and shared helper stubs on `main`. After this, `docker compose up` boots a running API with empty routers and every table/enum/constraint from Section 3.

---

### Task 0.1 — Repo Layout, Docker Compose & Config

**Creates**: `docker-compose.yml`, `.env.example`, `backend/Dockerfile`, `backend/requirements.txt`, `backend/alembic.ini`, `backend/alembic/env.py`, `backend/app/main.py`, `backend/app/config.py`, `backend/app/db.py`, all `__init__.py` files, `frontend/` placeholder.

**Instructions:**
- `docker-compose.yml` per Section 15: postgres:16 (healthcheck, pgdata volume), api (build ./backend, depends_on postgres healthy, command `alembic upgrade head && uvicorn ...`, ports 8000).
- `requirements.txt`: fastapi, uvicorn[standard], sqlalchemy>=2.0, alembic, psycopg2-binary, pydantic>=2.0, pydantic[email], python-jose[cryptography], passlib[bcrypt], python-dotenv.
- `config.py`: Pydantic `BaseSettings` loading `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRE_HOURS=8`, `JWT_ALGORITHM=HS256`.
- `db.py`: `create_engine`, `SessionLocal`, `Base = declarative_base()`, `get_db()` yielding session.
- `main.py`: FastAPI app factory, CORS middleware (allow all for hackathon), include all routers alphabetized (one `include_router` per module — see Task 0.5 for full list).

**Tests:** `docker compose build` succeeds. `docker compose up` starts both containers.

**Acceptance Criteria:**
- [ ] `docker compose up` boots postgres + api without crash
- [ ] `GET localhost:8000/docs` returns Swagger UI

---

### Task 0.2 — Full Alembic Migration

**Creates**: `backend/alembic/versions/001_initial_schema.py`

Single unified migration for ALL tables, enums, and constraints from Section 3.

**Instructions:**
1. Extensions: `CREATE EXTENSION IF NOT EXISTS pgcrypto, btree_gist, citext;`
2. All 12 Postgres enum types from Section 3.1 with exact values.
3. All 13 tables from Section 3.2 in FK-dependency order. Every table: `id UUID DEFAULT gen_random_uuid() PK`, `created_at/updated_at TIMESTAMPTZ DEFAULT now()`.
4. Crown jewel #1: `CREATE UNIQUE INDEX one_active_allocation_per_asset ON allocations (asset_id) WHERE returned_at IS NULL;`
5. Crown jewel #2: `ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings EXCLUDE USING gist (asset_id WITH =, time_range WITH &&) WHERE (status <> 'CANCELLED');`
6. Asset tag sequence: `CREATE SEQUENCE asset_tag_seq START 1;`
7. `downgrade()` drops everything in reverse.

**Tests:** `alembic upgrade head` clean. `downgrade base` then `upgrade head` again — idempotent.

**Acceptance Criteria:**
- [ ] All 13 tables, 12 enums, 2 crown jewel constraints, 1 sequence created
- [ ] Round-trip downgrade→upgrade succeeds

---

### Task 0.3 — SQLAlchemy Models

**Creates**: `backend/app/models/enums.py` + one file per entity in `models/`.

**Instructions:**
- `enums.py`: Python `(str, Enum)` classes for all 12 enums, values matching Section 3.1 exactly.
- One model file per table using SQLAlchemy 2.0 `mapped_column()` syntax.
- UUID PKs with `server_default=func.gen_random_uuid()`.
- `models/__init__.py` re-exports all models.

**Acceptance Criteria:**
- [ ] Every table has a model; all enum classes match Section 3.1
- [ ] `Base.metadata.tables` lists all 13 tables

---

### Task 0.4 — Security, Auth Guards & Shared Helper Stubs

**Creates**: `security.py`, `deps.py`, `services/activity_service.py`, `services/notifications_service.py`

**Instructions:**
- `security.py`: `hash_password()`, `verify_password()`, `create_access_token()`, `decode_access_token()`. bcrypt via passlib, JWT via python-jose.
- `deps.py`: `get_current_user(token, db)` → 401 on failure; `require_role(*roles)` → 403; `require_same_department()` → 403.
- `activity_service.log(db, actor_id, action, entity_type, entity_id, metadata)` — **stub body (`pass`)**, frozen signature.
- `notifications_service.create(db, recipient_id, type, message, entity_type, entity_id)` — **stub body**, frozen signature.
- `notifications_service.sync_derived(db)` — **stub body**, frozen signature.

**Acceptance Criteria:**
- [ ] JWT + bcrypt round-trips work
- [ ] Guards return correct 401/403
- [ ] Shared stubs importable by all tracks

---

### Task 0.5 — Empty Router Files

**Creates**: 12 empty router files in `routers/`, each exporting an `APIRouter()` with zero routes. All registered in `main.py`.

Router files: `auth.py`, `org.py`, `assets.py`, `allocation.py`, `transfers.py`, `booking.py`, `maintenance.py`, `audit.py`, `reports.py`, `notifications.py`, `dashboard.py`, `activity_logs.py`.

**Acceptance Criteria:**
- [ ] API boots with all tag groups visible in Swagger, zero endpoints
- [ ] No import errors in logs

---

### Stage 0 — Gate Checklist

Before any feature branch is created:
- [ ] `docker compose up` boots successfully
- [ ] `alembic upgrade head` creates full schema
- [ ] All models importable
- [ ] `security.py` functions work
- [ ] `deps.py` guards work
- [ ] Shared helper stubs importable
- [ ] Swagger UI shows all router tags
- [ ] `main` pushed; all tracks branch from this commit

---

## Stage 1 — Auth + Organization Setup + Employee Directory (Track A)

> **Owner**: Teammate A (or Integration Lead if pairing)
> **Branch**: `feature/track-a-auth-org`
> **Dependency**: Stage 0 complete on `main`
> **Owns**: `routers/auth.py`, `routers/org.py`, `services/auth_service.py`, `services/org_service.py`, `schemas/auth.py`, `schemas/org.py`

> [!NOTE]
> This track pairs with the Integration Lead in Stage 0 and finishes `deps.py` validation. Because auth gates everything, this track should be completed (or at minimum the login/signup endpoints) before demo testing of other tracks.

### Purpose

Deliver signup/login/me/forgot-password, JWT issuance, departments CRUD, categories CRUD, employee directory with role promotion, and user status management. This is the only path where roles change.

---

### Task 1.1 — Auth Schemas & Service

**Files**: `schemas/auth.py`, `services/auth_service.py`

**Schemas** (Pydantic v2):
- `SignupRequest`: `name: str`, `email: EmailStr`, `password: str` — NO `role` field.
- `LoginRequest`: `email: EmailStr`, `password: str`
- `TokenResponse`: `access_token: str`, `token_type: str = "bearer"`, `user: UserOut`
- `UserOut`: `id`, `name`, `email`, `role`, `department_id`, `status`, `created_at`

**Service**:
- `signup(db, data)`: Create user with `role=EMPLOYEE` always (ignore any role in input). Hash password. Return user.
- `login(db, email, password)`: Find by email, verify password, raise 401 if mismatch or inactive. Create JWT with claims `{sub: user_id, role, department_id, exp}`. Return `TokenResponse`.
- `get_me(db, user_id)`: Return current user profile.
- `forgot_password(email)`: **Stub** — return 200, do nothing.

**Tests:**
- Signup creates EMPLOYEE regardless of any role passed.
- Login with correct creds returns valid JWT.
- Login with wrong password → 401.
- Login with inactive user → 401.
- `/auth/me` with valid token returns user profile.

**Acceptance Criteria:**
- [ ] `POST /api/auth/signup` creates EMPLOYEE only, returns user
- [ ] `POST /api/auth/login` returns JWT with correct claims
- [ ] `POST /api/auth/forgot-password` returns 200 (no-op)
- [ ] `GET /api/auth/me` returns current user profile
- [ ] Role field in signup body is ignored/rejected

---

### Task 1.2 — Auth Router

**File**: `routers/auth.py`

Wire up 4 endpoints from Section 11 (Auth):

| Method | Path | Guard |
|---|---|---|
| POST | `/auth/signup` | public |
| POST | `/auth/login` | public |
| POST | `/auth/forgot-password` | public |
| GET | `/auth/me` | `get_current_user` |

**Acceptance Criteria:**
- [ ] All 4 endpoints functional, matching Section 11 signatures
- [ ] Public endpoints work without token; `/me` requires token

---

### Task 1.3 — Organization Schemas & Service

**Files**: `schemas/org.py`, `services/org_service.py`

**Schemas**:
- `DepartmentCreate`: `name`, `head_user_id?`, `parent_department_id?`
- `DepartmentUpdate`: `name?`, `head_user_id?`, `parent_department_id?`, `status?`
- `DepartmentOut`: all fields including head user name, parent name
- `CategoryCreate`: `name`, `custom_fields: dict = {}`
- `CategoryUpdate`: `name?`, `custom_fields?`
- `CategoryOut`: all fields
- `EmployeeUpdate`: `role?`, `department_id?`, `status?` — **only place roles change**
- `EmployeeOut`: full user profile

**Service**:
- `departments`: CRUD. DELETE = deactivate (set `status=INACTIVE`). Validate unique name.
- `categories`: CRUD. Validate unique name. `custom_fields` is a JSON schema dict.
- `employees`: List (mgr+ sees all; dept head sees own dept only — use `require_same_department`). **Patch** is the ONLY role-write path: admin sets `role`, `department_id`, `status`.
- Call `activity_service.log()` on role changes (`user.role_changed`).

**Tests:**
- Create department → shows in list.
- Delete department → status becomes INACTIVE.
- Department with duplicate name → 409/422.
- Create category with custom_fields → fields stored correctly.
- Admin patches employee role to ASSET_MANAGER → role updates.
- Non-admin attempts role patch → 403.
- Dept Head lists employees → sees only own department.

**Acceptance Criteria:**
- [ ] Departments: full CRUD with hierarchy (parent_department_id) support
- [ ] Categories: full CRUD with custom_fields
- [ ] Employees: list (scoped), patch (admin only, role/dept/status)
- [ ] Role changes logged via `activity_service.log()`
- [ ] Auth guards enforced per Section 8.1 matrix

---

### Task 1.4 — Organization Router

**File**: `routers/org.py`

Wire up endpoints from Section 11 (Organization setup):

| Method | Path | Guard |
|---|---|---|
| GET | `/departments` | mgr+ |
| POST | `/departments` | admin |
| PATCH | `/departments/{id}` | admin |
| DELETE | `/departments/{id}` | admin (deactivate) |
| GET | `/categories` | mgr+ |
| POST | `/categories` | admin |
| PATCH | `/categories/{id}` | admin |
| GET | `/employees` | mgr+ (dept-scoped for head) |
| PATCH | `/employees/{id}` | admin |

**Acceptance Criteria:**
- [ ] All 9 endpoints match Section 11 contracts
- [ ] Correct role guards on each endpoint

---

### Stage 1 — Gate Checklist

- [ ] Full auth flow: signup → login → use JWT → access /me
- [ ] EMPLOYEE role enforced on signup
- [ ] Departments CRUD with hierarchy & status
- [ ] Categories CRUD with custom_fields
- [ ] Employee directory with dept-scoped listing for Dept Head
- [ ] Role promotion/demotion: admin-only via PATCH /employees/{id}
- [ ] Activity log written on role changes
- [ ] All guards match Section 8.1 permission matrix

---

## Stage 2 — Assets + Allocation + Transfer (Track B) — Crown Jewel #1

> **Owner**: Teammate B
> **Branch**: `feature/track-b-assets-alloc`
> **Dependency**: Stage 0 complete on `main`
> **Owns**: `routers/assets.py`, `routers/allocation.py`, `routers/transfers.py`, `services/asset_service.py`, `services/allocation_service.py`, `services/transfer_service.py`, `schemas/assets.py`, `schemas/allocation.py`, `schemas/transfer.py`

> [!IMPORTANT]
> This track owns **Crown Jewel #1** — the double-allocation block. Both the DB constraint AND the service-layer pre-check must be implemented. The 409 response body format is specified in Section 6 and must be matched exactly.

### Purpose

Deliver asset registration (auto-tag), search/filter, detail with history, allocation with double-alloc prevention, return flow, transfer request→approve/reject, and overdue flagging.

---

### Task 2.1 — Asset Schemas & Service

**Files**: `schemas/assets.py`, `services/asset_service.py`

**Schemas**:
- `AssetCreate`: `name`, `category_id`, `serial_number?`, `acquisition_date?`, `acquisition_cost?`, `condition?`, `location?`, `photo_url?`, `is_bookable=false`, `custom_values: dict = {}`
- `AssetUpdate`: all optional except `status` has guarded transitions (only AVAILABLE→RETIRED→DISPOSED by admin/mgr)
- `AssetOut`: all fields + computed `asset_tag`
- `AssetDetail`: extends `AssetOut` with allocation history, maintenance history

**Service**:
- `register(db, data)`: Generate tag via Postgres sequence `SELECT nextval('asset_tag_seq')` → format `AF-{val:04d}`. Insert asset with `status=AVAILABLE`. Log `asset.registered`.
- `list(db, filters)`: Support filters: `q` (search tag/serial/name), `category_id`, `status`, `department_id`, `location`, `is_bookable`. Pagination `limit/offset`.
- `get_detail(db, id)`: Asset + allocation history + maintenance history.
- `update(db, id, data)`: Edit fields. For `status` changes, enforce allowed transitions only (Section 4): AVAILABLE→RETIRED, RETIRED→DISPOSED by asset_mgr+. Log `asset.status_changed`.

**Tests:**
- Register asset → tag auto-generated as `AF-0001`, status `AVAILABLE`.
- Register 3 assets → tags sequential `AF-0001`, `AF-0002`, `AF-0003`.
- Search by tag substring → finds correct asset.
- Filter by status `AVAILABLE` → returns only available assets.
- Retire an ALLOCATED asset → rejected (invalid transition).

**Acceptance Criteria:**
- [ ] Auto-tag via Postgres sequence, format `AF-####`
- [ ] Full search/filter on tag, serial, name, category, status, location, is_bookable
- [ ] Asset detail includes allocation + maintenance history
- [ ] Status transitions enforced per Section 4 state machine
- [ ] Activity logged on register and status changes

---

### Task 2.2 — Allocation Schemas & Service (Crown Jewel #1)

**Files**: `schemas/allocation.py`, `services/allocation_service.py`

**Schemas**:
- `AllocateRequest`: `asset_id`, `holder_user_id?`, `holder_department_id?`, `expected_return_date?`
- `ReturnRequest`: `return_condition_notes?`
- `AllocationOut`: all fields with holder name, asset tag
- `ConflictResponse` (409 body — Section 6):
```json
{
  "error": "asset_already_allocated",
  "message": "Currently held by {name} ({department}).",
  "current_holder": { "user_id": "...", "name": "...", "department": "..." },
  "suggested_action": "transfer_request"
}
```

**Service — `allocate(db, data, actor)`** (Section 6, exact):
1. Check asset exists, status allows allocation.
2. **Pre-check**: Query for ACTIVE allocation on this `asset_id` (where `returned_at IS NULL`).
3. If found → raise `409 Conflict` with the exact JSON body above, including current holder name and department.
4. Else → in ONE transaction: insert allocation (ACTIVE), set `asset.status = ALLOCATED`, write `activity_service.log(db, actor, "asset.allocated", ...)`, create `ASSET_ASSIGNED` notification to holder.

**Service — `return_asset(db, allocation_id, notes, actor)`** (Section 6):
1. Set `returned_at = now()`, `status = RETURNED`, capture `return_condition_notes`.
2. Set `asset.status = AVAILABLE`.
3. Log `asset.returned`, notify if needed.

**Service — `list_allocations(db, filters)`**: Support `overdue=true` filter (`expected_return_date < today AND status = ACTIVE`), `holder_user_id`.

**Tests:**
- Allocate available asset → success, asset becomes ALLOCATED.
- Allocate same asset again → 409 with exact conflict body.
- Return → asset back to AVAILABLE, allocation becomes RETURNED.
- After return, allocate again → succeeds.
- List with `overdue=true` → returns only overdue allocations.
- Concurrent double-allocation attempt → DB constraint catches it even if service check is bypassed.

**Acceptance Criteria:**
- [ ] Double-allocation returns 409 with exact Section 6 JSON body
- [ ] Allocation creates ASSET_ASSIGNED notification
- [ ] Return sets asset AVAILABLE, allocation RETURNED
- [ ] Overdue filter works correctly
- [ ] Both DB constraint AND service pre-check enforce the rule

---

### Task 2.3 — Transfer Schemas & Service

**Files**: `schemas/transfer.py`, `services/transfer_service.py`

**Schemas**:
- `TransferCreate`: `asset_id`, `to_user_id`, `reason?`
- `TransferOut`: all fields with names resolved

**Service** (Section 6, Transfer flow):
- `create(db, data, actor)`: Validate asset is currently allocated to `from_user` (the actor or specified user). Insert `REQUESTED`. Log `transfer.requested`.
- `approve(db, transfer_id, actor)`: In ONE transaction — close current allocation (RETURNED), open new allocation to `to_user` (ACTIVE), set transfer `COMPLETED`, log `asset.transferred`, notify both parties (`TRANSFER_APPROVED`). Asset stays `ALLOCATED`.
- `reject(db, transfer_id, actor)`: Set `REJECTED`, notify requester.
- `list(db, filters)`: Filter by status, department scope for Dept Head.

**Tests:**
- Create transfer for allocated asset → REQUESTED.
- Create transfer for unallocated asset → error.
- Approve → old allocation RETURNED, new allocation ACTIVE, asset still ALLOCATED, transfer COMPLETED.
- Reject → REJECTED, no allocation changes.

**Acceptance Criteria:**
- [ ] Transfer only for currently-allocated assets
- [ ] Approve atomically re-allocates (close old + open new in one tx)
- [ ] Both parties notified on approval
- [ ] Dept Head can only approve within own department

---

### Task 2.4 — Asset, Allocation & Transfer Routers

**Files**: `routers/assets.py`, `routers/allocation.py`, `routers/transfers.py`

Wire up all endpoints from Section 11 (Assets, Allocation & Transfer):

| Method | Path | Guard |
|---|---|---|
| POST | `/assets` | asset_mgr+ |
| GET | `/assets` | user |
| GET | `/assets/{id}` | user |
| PATCH | `/assets/{id}` | asset_mgr+ |
| POST | `/allocations` | asset_mgr+ / head(dept) |
| POST | `/allocations/{id}/return` | asset_mgr+ / head(dept) |
| GET | `/allocations` | user |
| POST | `/transfers` | user(own)+ |
| GET | `/transfers` | mgr+/head(dept) |
| POST | `/transfers/{id}/approve` | asset_mgr+ / head(dept) |
| POST | `/transfers/{id}/reject` | asset_mgr+ / head(dept) |

**Acceptance Criteria:**
- [ ] All 11 endpoints match Section 11
- [ ] Correct role guards per Section 8.1

---

### Stage 2 — Gate Checklist

- [x] Asset registration with auto-tag sequence
- [x] Full search/filter working
- [x] **Crown Jewel #1**: Double-allocation blocked at BOTH service and DB level
- [x] 409 response matches Section 6 JSON format exactly
- [x] Return flow: asset→AVAILABLE, allocation→RETURNED
- [x] Transfer: request→approve (atomic re-alloc) or reject
- [x] Overdue allocations flagged correctly
- [x] All activity logged, notifications sent
- [x] All guards match Section 8.1

---

## Stage 3 — Booking + Maintenance (Track C) — Crown Jewel #2

> **Owner**: Teammate C
> **Branch**: `feature/track-c-booking-maint`
> **Dependency**: Stage 0 complete on `main`
> **Owns**: `routers/booking.py`, `routers/maintenance.py`, `services/booking_service.py`, `services/maintenance_service.py`, `schemas/booking.py`, `schemas/maintenance.py`

> [!IMPORTANT]
> This track owns **Crown Jewel #2** — the booking overlap block. Both the DB exclusion constraint AND the service-layer pre-check must be implemented. The 409 response body is specified in Section 7 and must be matched exactly. Time ranges are half-open `[start, end)`.

### Purpose

Deliver calendar read with derived temporal status, booking create with overlap prevention, cancel/reschedule, maintenance raise + transition state machine driving asset status, and kanban-style list grouping.

---

### Task 3.1 — Booking Schemas & Service (Crown Jewel #2)

**Files**: `schemas/booking.py`, `services/booking_service.py`

**Schemas**:
- `BookingCreate`: `asset_id`, `start: datetime`, `end: datetime`, `department_id?`
- `BookingOut`: all fields + derived `temporal_status` (computed from time_range vs now)
- `ConflictResponse` (409 body — Section 7):
```json
{
  "error": "booking_overlap",
  "message": "Slot unavailable — overlaps an existing booking.",
  "conflicting_booking": { "id": "...", "start": "...", "end": "..." }
}
```

**Service — `create(db, data, actor)`** (Section 7, exact):
1. Verify `asset.is_bookable = true` → else `422` ("Asset is not bookable").
2. Build `requested_range = [start, end)` as a `tstzrange`.
3. **Pre-check**: Query for any non-cancelled booking on this asset where `time_range && requested_range`.
4. If found → raise `409 Conflict` with the exact JSON body above.
5. Else → insert booking (status `UPCOMING`), log `booking.created`, notify `BOOKING_CONFIRMED`.

**Service — `cancel(db, booking_id, actor)`**: Set `status = CANCELLED`. Log `booking.cancelled`, notify `BOOKING_CANCELLED`.

**Service — `reschedule(db, booking_id, new_start, new_end, actor)`**: In one transaction — cancel existing, create new with overlap re-check. Section 7: "reschedule = cancel-then-create."

**Service — `list(db, filters)`**: `GET /bookings?asset_id=&date=` returns the day's bookings. Derive temporal status at read time:
- `now < start` → `UPCOMING`
- `start ≤ now < end` → `ONGOING`
- `now ≥ end` → `COMPLETED`
- Unless persisted `CANCELLED`.

**Tests:**
- Book a bookable asset 09:00–10:00 → success, status UPCOMING.
- Book same asset 09:30–10:30 → 409 with exact overlap body.
- Book same asset 10:00–11:00 → success (half-open, touching endpoints OK).
- Book non-bookable asset → 422.
- Cancel booking → status CANCELLED, slot freed.
- Reschedule: old cancelled, new created with overlap re-check.
- List by date returns correct derived temporal statuses.

**Acceptance Criteria:**
- [ ] Overlap blocked at BOTH service and DB level
- [ ] 409 response matches Section 7 JSON format exactly
- [ ] Half-open range semantics: `[start, end)` — touching endpoints allowed
- [ ] Non-bookable assets rejected with 422
- [ ] Cancel frees the exclusion constraint
- [ ] Reschedule is atomic cancel-then-create
- [ ] Temporal status derived correctly at read time
- [ ] Activity logged and notifications sent

---

### Task 3.2 — Maintenance Schemas & Service

**Files**: `schemas/maintenance.py`, `services/maintenance_service.py`

**Schemas**:
- `MaintenanceCreate`: `asset_id`, `issue_description`, `priority? = MEDIUM`, `photo_url?`
- `MaintenanceTransition`: `to_status`, `technician_name?` (free-text, not an entity)
- `MaintenanceOut`: all fields with asset tag, raised-by name

**Service** (Section 4, maintenance state machine):
- `raise_request(db, data, actor)`: Insert with `status=PENDING`. Log `maintenance.raised`.
- `transition(db, request_id, to_status, technician_name, actor)`: Validate allowed transitions:
  - `PENDING → APPROVED` or `PENDING → REJECTED`
  - `APPROVED → TECHNICIAN_ASSIGNED` (requires `technician_name`)
  - `TECHNICIAN_ASSIGNED → IN_PROGRESS`
  - `IN_PROGRESS → RESOLVED`

  **Asset status side-effects** (Section 4):
  - On `APPROVED`: set `asset.status = UNDER_MAINTENANCE`. Notify `MAINTENANCE_APPROVED`.
  - On `REJECTED`: notify `MAINTENANCE_REJECTED`. No asset change.
  - On `RESOLVED`: set `asset.status = AVAILABLE`. Log `maintenance.resolved`.

- `list(db, filters)`: Return all requests, groupable by `status` for kanban view. Support `asset_id`, `status`, `priority` filters.

**Tests:**
- Raise request → PENDING, asset unchanged.
- Approve → asset becomes UNDER_MAINTENANCE, notification sent.
- Reject → asset unchanged, notification sent.
- Approve → Assign tech → In progress → Resolve → asset back to AVAILABLE.
- Invalid transition (e.g. PENDING → RESOLVED) → error.
- Kanban list returns requests grouped by status.

**Acceptance Criteria:**
- [ ] All 6 maintenance statuses reachable via valid transitions only
- [ ] APPROVED drives asset to UNDER_MAINTENANCE
- [ ] RESOLVED drives asset back to AVAILABLE
- [ ] Invalid transitions rejected
- [ ] Kanban-style list groupable by status
- [ ] Activity logged at each transition
- [ ] Notifications sent on APPROVED and REJECTED

---

### Task 3.3 — Booking & Maintenance Routers

**Files**: `routers/booking.py`, `routers/maintenance.py`

Wire up all endpoints from Section 11 (Bookings, Maintenance):

| Method | Path | Guard |
|---|---|---|
| GET | `/bookings` | user |
| POST | `/bookings` | user+ |
| POST | `/bookings/{id}/cancel` | owner / mgr+ |
| POST | `/bookings/{id}/reschedule` | owner / mgr+ |
| POST | `/maintenance` | user+ |
| GET | `/maintenance` | user |
| POST | `/maintenance/{id}/transition` | asset_mgr+ |

**Acceptance Criteria:**
- [ ] All 7 endpoints match Section 11
- [ ] Correct role guards per Section 8.1

---

### Stage 3 — Gate Checklist

- [ ] **Crown Jewel #2**: Booking overlap blocked at BOTH service and DB level
- [ ] 409 response matches Section 7 JSON format exactly
- [ ] Half-open ranges work correctly (touching endpoints allowed)
- [ ] Calendar read with derived temporal statuses
- [ ] Cancel/reschedule functional
- [ ] Maintenance state machine: all valid transitions work, invalid ones rejected
- [ ] Asset status driven by maintenance (UNDER_MAINTENANCE ↔ AVAILABLE)
- [ ] Kanban list groupable by status
- [ ] All activity logged, notifications sent
- [ ] All guards match Section 8.1

---

## Stage 4 — Audit + Reports + Notifications + Dashboard + Logs (Track D)

> **Owner**: Teammate D
> **Branch**: `feature/track-d-audit-reports`
> **Dependency**: Stage 0 complete on `main`
> **Owns**: `routers/audit.py`, `routers/reports.py`, `routers/notifications.py`, `routers/dashboard.py`, `routers/activity_logs.py`, `services/audit_service.py`, `services/report_service.py`, `services/notifications_service.py` (fills stub bodies), `services/activity_service.py` (fills stub body), `schemas/audit.py`, `schemas/reports.py`, `schemas/notifications.py`, `schemas/dashboard.py`

> [!NOTE]
> This track **fills in** the stub bodies for `activity_service.log()` and `notifications_service.create()` / `sync_derived()` that Stage 0 published. The signatures are frozen — do not change them.

### Purpose

Deliver audit cycle management (create/assign auditors/mark/close→discrepancy report→LOST), all report aggregations + CSV export, notifications feed with derived sync, activity log, and dashboard KPIs.

---

### Task 4.1 — Activity Service & Notifications Service (Fill Stubs)

**Files**: `services/activity_service.py`, `services/notifications_service.py`

**Instructions — `activity_service.log()`**: Replace `pass` with actual INSERT into `activity_logs` table using the frozen signature.

**Instructions — `notifications_service.create()`**: Replace `pass` with actual INSERT into `notifications` table using the frozen signature.

**Instructions — `notifications_service.sync_derived()`** (Section 9): Replace `pass` with:
1. Find allocations where `status=ACTIVE AND expected_return_date < today` that lack an unread `OVERDUE_RETURN` notification → create them.
2. Find `UPCOMING` bookings starting within next 30 min that lack a `BOOKING_REMINDER` → create them.
3. This function must be **idempotent** — safe to call multiple times without duplicating notifications.

**Tests:**
- `log()` creates an activity_log row with correct fields.
- `create()` creates a notification row.
- `sync_derived()` creates OVERDUE_RETURN for overdue allocations.
- `sync_derived()` is idempotent — calling twice doesn't duplicate.

**Acceptance Criteria:**
- [ ] Stub bodies replaced with real implementations
- [ ] Signatures unchanged (no breaking changes for other tracks)
- [ ] `sync_derived()` is idempotent

---

### Task 4.2 — Audit Schemas & Service

**Files**: `schemas/audit.py`, `services/audit_service.py`

**Schemas**:
- `AuditCycleCreate`: `name`, `scope_department_id?`, `scope_location?`, `start_date`, `end_date`
- `AuditCycleOut`: all fields + item counts by verification status
- `AuditItemUpdate`: `verification` (VERIFIED|MISSING|DAMAGED), `notes?`
- `AuditItemOut`: all fields with asset tag, expected location
- `AssignAuditorsRequest`: `user_ids: list[UUID]`
- `DiscrepancyReport`: list of items marked MISSING or DAMAGED

**Service**:
- `create_cycle(db, data, actor)`: Create cycle (OPEN). Snapshot in-scope assets into `audit_items` with `verification=PENDING` and `expected_location` = asset's current location. Scope by department and/or location if provided.
- `assign_auditors(db, cycle_id, user_ids)`: Insert into `audit_cycle_auditors` join table.
- `mark_item(db, item_id, verification, notes, actor)`: Set verification status. Only assigned auditors can mark items (check `audit_cycle_auditors`).
- `close_cycle(db, cycle_id, actor)`: Lock cycle (`status=CLOSED`). For each item with `verification=MISSING` → set `asset.status=LOST`. Auto-generate discrepancy report. Create `AUDIT_DISCREPANCY` notifications for each flagged item. Log `audit.cycle_closed`.
- `get_discrepancies(db, cycle_id)`: Return items marked MISSING or DAMAGED.

**Tests:**
- Create cycle → OPEN, items snapshotted for in-scope assets.
- Assign auditors → auditors can mark items.
- Non-auditor tries to mark → 403.
- Mark item MISSING → recorded.
- Close cycle → MISSING items' assets become LOST, discrepancy notifications sent.
- Get discrepancies → returns MISSING + DAMAGED items.

**Acceptance Criteria:**
- [ ] Cycle creation snapshots in-scope assets as audit_items
- [ ] Only assigned auditors can mark items
- [ ] Closing cycle: MISSING → asset LOST, discrepancy report generated
- [ ] AUDIT_DISCREPANCY notifications created on close
- [ ] Discrepancies endpoint returns flagged items

---

### Task 4.3 — Reports Service

**Files**: `schemas/reports.py`, `services/report_service.py`

All report endpoints from Section 11 (Reports):

| Endpoint | Logic |
|---|---|
| `GET /reports/utilization` | Allocation ratio by department: (allocated assets / total assets) per dept |
| `GET /reports/most-used` | Ranked by booking/allocation count |
| `GET /reports/idle` | Assets with no allocation or booking in N days |
| `GET /reports/maintenance-frequency` | Count of maintenance requests by asset/category |
| `GET /reports/due` | Assets due for maintenance or nearing retirement |
| `GET /reports/booking-heatmap` | Booking counts per weekday×hour bucket (7×24 grid) |
| `GET /reports/export` | CSV export of a chosen report (`?report=utilization\|most-used\|...`) |

**Instructions:**
- Each report is a SQL aggregate query returning JSON.
- Booking heatmap: extract `dow` and `hour` from booking `time_range` lower bounds, count per bucket.
- CSV export: accept `report` query param, run the same query, format as CSV with `text/csv` content type.
- All reports scoped by role: mgr+ sees all, dept head sees own dept.

**Tests:**
- Utilization returns per-department ratios.
- Most-used returns assets ranked by usage count.
- Booking heatmap returns 7×24 grid of counts.
- CSV export returns valid CSV with correct headers.

**Acceptance Criteria:**
- [ ] All 7 report endpoints return correct aggregations
- [ ] CSV export works for each report type
- [ ] Reports scoped by viewer's role/department

---

### Task 4.4 — Dashboard Service

**Files**: `schemas/dashboard.py`, `services/dashboard_service.py`

**Service** (Section 10): `GET /dashboard` returns:
- `assets_available`: count where status=AVAILABLE
- `assets_allocated`: count where status=ALLOCATED
- `maintenance_today`: maintenance requests approved/created today or currently UNDER_MAINTENANCE
- `active_bookings`: bookings whose time_range spans now
- `pending_transfers`: transfer_requests with status=REQUESTED
- `upcoming_returns`: allocations with expected_return_date in next 7 days, not overdue
- `overdue_returns`: allocations with expected_return_date < today, status ACTIVE — **highlighted separately**
- `recent_activity`: latest N activity_logs

**Call `notifications_service.sync_derived()` first** so overdue counts are fresh.

Scope all counts by viewer's permissions (admin/mgr sees all, dept head sees own dept, employee sees own).

**Tests:**
- Dashboard returns all KPI fields.
- Overdue returns are listed separately from upcoming.
- `sync_derived()` is called before response.

**Acceptance Criteria:**
- [ ] All KPI fields from Section 10 present
- [ ] Overdue returns highlighted/separate
- [ ] `sync_derived()` called at top of handler
- [ ] Scoped by viewer's role

---

### Task 4.5 — Notifications & Activity Log Routers

**Files**: `routers/notifications.py`, `routers/activity_logs.py`

| Method | Path | Guard |
|---|---|---|
| GET | `/notifications` | user (calls `sync_derived()` first) |
| POST | `/notifications/{id}/read` | user |
| GET | `/activity-logs` | mgr+/dept/own |

**Notifications list**: Filter by `?type=`. Call `sync_derived()` before returning.
**Activity logs**: mgr+ sees all, dept head sees own dept, employee sees own actions.

**Acceptance Criteria:**
- [ ] Notifications list calls `sync_derived()` first
- [ ] Mark-as-read works
- [ ] Activity logs scoped by role

---

### Task 4.6 — Audit, Reports, Dashboard & Notification Routers

**Files**: `routers/audit.py`, `routers/reports.py`, `routers/dashboard.py`

Wire up remaining endpoints from Section 11:

| Method | Path | Guard |
|---|---|---|
| POST | `/audit-cycles` | admin |
| POST | `/audit-cycles/{id}/auditors` | admin |
| GET | `/audit-cycles` | mgr+/auditor |
| GET | `/audit-cycles/{id}` | mgr+/auditor |
| PATCH | `/audit-items/{id}` | assigned auditor |
| POST | `/audit-cycles/{id}/close` | admin |
| GET | `/audit-cycles/{id}/discrepancies` | mgr+ |
| GET | `/reports/utilization` | mgr+ |
| GET | `/reports/most-used` | mgr+ |
| GET | `/reports/idle` | mgr+ |
| GET | `/reports/maintenance-frequency` | mgr+ |
| GET | `/reports/due` | mgr+ |
| GET | `/reports/booking-heatmap` | mgr+ |
| GET | `/reports/export` | mgr+ |
| GET | `/dashboard` | user |

**Acceptance Criteria:**
- [ ] All 15 endpoints match Section 11
- [ ] Correct role guards per Section 8.1

---

### Stage 4 — Gate Checklist

- [ ] Activity log helper writes rows correctly
- [ ] Notification helper creates notifications correctly
- [ ] `sync_derived()` generates OVERDUE_RETURN and BOOKING_REMINDER idempotently
- [ ] Audit cycle: create→snapshot, assign auditors, mark items, close→LOST+discrepancies
- [ ] All 7 report endpoints return correct data + CSV export
- [ ] Dashboard returns all KPIs, calls sync_derived first
- [ ] Notifications list with sync, mark-read
- [ ] Activity logs scoped by role
- [ ] All guards match Section 8.1

---

## Stage 5 — Seed Data & Frontend (Integration Lead)

> **Owner**: Integration Lead
> **Branch**: `feature/seed-and-frontend`
> **Dependency**: Stages 1–4 merged into `main`
> **Owns**: `backend/app/seed/seed.py`, `frontend/*`

### Purpose

Create the simulation data generator per Section 13 so every screen looks alive during the demo, and build the frontend to match the Excalidraw mockup.

---

### Task 5.1 — Seed Script

**File**: `backend/app/seed/seed.py`

Runnable via: `docker compose run --rm api python -m app.seed.seed`

**Instructions** (Section 13, exact):

**Flags**: `--reset` truncates all data before seeding. Default: upsert by natural key.
**Deterministic**: `random.seed(42)`. **Timestamps relative to `now()`**, never hardcoded.

**Required records:**

| Entity | Count | Key Details |
|---|---|---|
| Users | ~22 | 1 Admin (`admin@assetflow.io`), 2 Asset Managers, 4 Dept Heads, ~15 Employees. Include **Priya Shah** and **Raj/Arjun Nair**. All passwords bcrypt-hashed. Print demo login table at end. |
| Departments | 5 | Engineering, Facilities, Field Ops, IT, Admin. One child (Field Ops East → Field Ops). One INACTIVE. Heads assigned. |
| Categories | 5 | Electronics (`{warranty_months: int}`), Vehicles (`{registration_no: str}`), Furniture, Equipment, Spaces. |
| Assets | ~50 | Tags `AF-0001…` via sequence. ~55% AVAILABLE, ~25% ALLOCATED, ~8% UNDER_MAINTENANCE, 1-2 LOST, 1 RETIRED, 1 DISPOSED. ~5 bookable incl. **Conference Room B2**. **Laptop AF-0114 allocated to Priya Shah / Engineering, ALLOCATED.** |
| Allocations | matches | Active ones for ALLOCATED assets. **2–3 overdue** (expected_return_date = now - {2,5,9} days, still ACTIVE). Some RETURNED historical. |
| Transfers | 3 | 1-2 REQUESTED (feeds pending_transfers KPI), 1 COMPLETED. |
| Bookings | ~8 | **Conference Room B2: existing 09:00–10:00 today** (overlap demo). Mix of upcoming/ongoing/completed across bookable assets. |
| Maintenance | 6+ | One card per kanban column: PENDING, APPROVED, TECHNICIAN_ASSIGNED, IN_PROGRESS, RESOLVED + one REJECTED. Matching asset statuses. |
| Audit cycles | 2 | One OPEN ("Q3 audit: Engineering, 1-15 Jul"), 2-3 auditors, items with PENDING/VERIFIED/MISSING/DAMAGED. One CLOSED. |
| Notifications | ~10 | Examples from Screen 10: asset assigned, maintenance approved, booking confirmed, transfer approved, overdue return, audit discrepancy. Mixed read/unread, relative timestamps. |
| Activity logs | ~30 | Across actors/actions, relative timestamps, matching seeded state changes. |

**Consistency assertions (run at end of seed):**
- Every ALLOCATED asset has exactly 1 ACTIVE allocation; every AVAILABLE asset has 0.
- Every UNDER_MAINTENANCE asset has an open maintenance request in appropriate status.
- No two non-cancelled bookings overlap on same asset (DB constraint validates).
- Overdue allocations have `expected_return_date < today` and `status = ACTIVE`.

**Tests:**
- `docker compose run --rm api python -m app.seed.seed` completes without error.
- `--reset` flag works (truncate + re-seed).
- All consistency assertions pass.
- Dashboard populated with realistic KPIs after seed.

**Acceptance Criteria:**
- [ ] Seed runs cleanly, idempotent, deterministic
- [ ] All entity counts match spec
- [ ] Demo anchors set: AF-0114 allocated to Priya, Conference Room B2 booked 09:00-10:00
- [ ] Overdue allocations, pending transfers, mixed maintenance kanban all present
- [ ] Consistency assertions all pass
- [ ] Demo login table printed at end

---

### Task 5.2 — Frontend Application

**File**: `frontend/*`

**Instructions:**
Build the frontend to match the Excalidraw mockup image. The frontend consumes the API at `/api/*`. It has 10 screens matching the mockup:

**Screen 1 — Login/Signup**: Dark-themed card with AF logo, email/password fields, "Forgot password" link, signup note ("creates employee account, admin roles assigned later"), "Create Account" button.

**Screen 2 — Dashboard**: Left sidebar navigation (Dashboard, Org Setup, Assets, Allocation & Transfer, Resource Booking, Maintenance, Audit, Reports, Notifications). Main area shows: "Today's Overview" KPI cards (Available, Allocated, Available counts + Active Bookings, Pending Transfers, Upcoming Returns), overdue returns alert banner, quick-action buttons (Register Asset, Book Resource, Raise Request), Recent Activity feed.

**Screen 3 — Organization Setup (Admin)**: Tab navigation (Departments, Categories, Employees, + Add). Departments table (name, head, parent dept, status with Active/Inactive badges). Note about hierarchy.

**Screen 4 — Asset Registry**: Search bar (tag, serial, QR code) + "Register Asset" button. Filter pills (Category, Status, Department). Assets table (Tag, Name, Category, Status, Location).

**Screen 5 — Allocation & Transfer**: Asset detail view showing allocation status. Red conflict banner ("Already allocated to Priya Shah (Engineering)"), "Transfer Request" flow with from/to employee selectors. Allocation history below.

**Screen 6 — Resource Booking**: Asset header (Conference Room B2). Time slot grid showing existing bookings (green = booked, red = conflict). Overlap rejection message. "Book a slot" button.

**Screen 7 — Maintenance Kanban**: Column board — Pending | Approved | Technician Assigned | In Progress | Resolved. Cards show asset tag, issue summary, priority. Note about status-driven asset transitions.

**Screen 8 — Audit**: Cycle header (name, dates). Checklist table (Asset, Expected Location, Verification status badges — Verified/Missing/Damaged). Discrepancy report banner. "Close audit cycle" button.

**Screen 9 — Reports**: Charts — Utilization by Department (bar), Maintenance Frequency (bar). Text sections: Most Used Assets, Idle Assets, Assets Due for Maintenance/Retirement. "Export Report" button.

**Screen 10 — Notifications & Activity Logs**: Tab filters (All, Alerts, Approvals, Bookings). Notification list with icons, timestamps, read/unread states.

**Tech stack**: Vanilla HTML/CSS/JS or lightweight framework (Vite + vanilla). Dark theme matching mockup. Responsive. Calls API with JWT in `Authorization: Bearer` header.

**Acceptance Criteria:**
- [ ] All 10 screens implemented matching mockup layout
- [ ] Dark theme with status badges (green Active, red Inactive, etc.)
- [ ] API integration: login→JWT storage→authenticated requests
- [ ] Sidebar navigation between all screens
- [ ] KPI cards on dashboard populated from API
- [ ] Double-allocation conflict shown on Screen 5
- [ ] Booking overlap shown on Screen 6
- [ ] Kanban board on Screen 7
- [ ] Audit checklist with verification badges on Screen 8

---

### Stage 5 — Gate Checklist

- [ ] Seed script runs cleanly, all assertions pass
- [ ] Frontend boots, all 10 screens navigable
- [ ] Frontend correctly calls API and displays data
- [ ] Demo anchors (AF-0114, Conference Room B2) visible in UI

---

## Stage 6 — Integration, E2E Verification & Demo (Integration Lead)

> **Owner**: Integration Lead
> **Branch**: `main` (after all merges)
> **Dependency**: Stages 1–5 all merged

### Purpose

Merge all tracks, run end-to-end verification, and execute the demo script from Section 14.

---

### Task 6.1 — Merge & Smoke Test

1. Merge all feature branches into `main` in order: Track A → Track D → Track B → Track C → Seed+Frontend.
   - Track D before B/C because B and C call `activity_service.log()` and `notifications_service.create()` which D implements.
2. Run `docker compose down -v && docker compose up --build`.
3. Run `alembic upgrade head` + seed.
4. Verify Swagger UI shows all endpoints.

**Acceptance Criteria:**
- [ ] Clean merge, no conflicts
- [ ] All services boot without errors
- [ ] All endpoints visible in Swagger

---

### Task 6.2 — End-to-End Demo Walkthrough (Section 14)

Execute the demo script from design.md Section 14, step by step:

| Step | Action | Expected Result |
|---|---|---|
| 1 | Login as Admin | Dashboard shows KPIs including **overdue returns highlighted** |
| 2 | Org setup | Departments (hierarchy + inactive visible), category with custom field, **promote Employee to Asset Manager** |
| 3 | Register asset | Auto tag `AF-00xx`, enters AVAILABLE |
| 4 | **Crown Jewel #1** | Allocate AF-0114 → blocked "held by Priya Shah (Engineering)" → Transfer Request → Approve → holder changes |
| 5 | **Crown Jewel #2** | Conference Room B2: 09:30–10:30 → rejected (overlap) → 10:00–11:00 → accepted |
| 6 | Maintenance | Raise → Approve → asset UNDER_MAINTENANCE, card moves → Resolve → AVAILABLE |
| 7 | Audit | Open Q3 cycle → mark item MISSING → Close → discrepancy report + asset LOST + notification |
| 8 | Reports & Notifications | Utilization/idle/heatmap charts + notification feed shows all events |

**Tests (all via API or UI):**
- Each step produces the expected HTTP status and response body.
- State transitions are reflected in dashboard KPIs.
- Notifications appear in feed after each action.
- Activity log records all actions.

**Acceptance Criteria:**
- [ ] All 8 demo steps pass end-to-end
- [ ] Both crown jewels demonstrated with correct 409 responses
- [ ] Dashboard KPIs update in real-time after each action
- [ ] Notifications feed populated
- [ ] Activity log complete

---

### Stage 6 — Final Gate (Ship It)

- [ ] Full demo script executed successfully
- [ ] Both crown jewels verified (double-alloc 409 + booking overlap 409)
- [ ] All screens populated with seed data
- [ ] No console errors, no 500s
- [ ] Docker Compose boots from scratch: `docker compose up --build` → seed → demo

---

## Team Assignment Matrix

> [!IMPORTANT]
> **Stages 2, 3, 4 are for your 3 teammates.** They run in parallel after Stage 0. Stages 0, 1, 5, 6 are for the Integration Lead (you).

| Stage | Track | Owner | Branch | Duration Est. |
|---|---|---|---|---|
| **Stage 0** | Skeleton & Foundation | **Integration Lead (Omm)** | `main` | ~45 min |
| **Stage 1** | Auth + Org + Employee Directory | **Integration Lead (Omm)** — or pair with Teammate A | `feature/track-a-auth-org` | ~1.5 hr |
| **Stage 2** | Assets + Allocation + Transfer (CJ#1) | **Teammate B** | `feature/track-b-assets-alloc` | ~2 hr |
| **Stage 3** | Booking + Maintenance (CJ#2) | **Teammate C** | `feature/track-c-booking-maint` | ~2 hr |
| **Stage 4** | Audit + Reports + Notif + Dashboard | **Teammate D** | `feature/track-d-audit-reports` | ~2.5 hr |
| **Stage 5** | Seed Data + Frontend | **Integration Lead (Omm)** | `feature/seed-and-frontend` | ~2 hr |
| **Stage 6** | Integration & Demo | **Integration Lead (Omm)** | `main` | ~1 hr |

### Parallelization Timeline

```
Hour 0    ─── Stage 0 (all together) ───────────┐
                                                  │
Hour 0:45 ─── Branch point ─────────────────────┤
              │                                   │
              ├── Stage 1 (Lead) ────────────┐   │
              ├── Stage 2 (Teammate B) ──────┤   │
              ├── Stage 3 (Teammate C) ──────┤   │
              └── Stage 4 (Teammate D) ──────┤   │
                                              │   │
Hour 3:00 ─── All PRs merged ────────────────┤   │
                                              │   │
Hour 3:00 ─── Stage 5 (Seed + Frontend) ─────┤   │
                                              │   │
Hour 5:00 ─── Stage 6 (Integration + Demo) ──┘   │
                                                  │
Hour 6:00 ─── SHIP ──────────────────────────────┘
```

### File Ownership (Disjoint — Zero Conflicts)

| Track | Files Owned (exclusive write) |
|---|---|
| **Stage 0 (Lead)** | `main.py`, `config.py`, `db.py`, `security.py`, `deps.py`, `alembic/*`, `models/*`, `docker-compose.yml`, `.env.example`, `Dockerfile`, `requirements.txt` |
| **Stage 1 (Lead/A)** | `routers/auth.py`, `routers/org.py`, `services/auth_service.py`, `services/org_service.py`, `schemas/auth.py`, `schemas/org.py` |
| **Stage 2 (B)** | `routers/assets.py`, `routers/allocation.py`, `routers/transfers.py`, `services/asset_service.py`, `services/allocation_service.py`, `services/transfer_service.py`, `schemas/assets.py`, `schemas/allocation.py`, `schemas/transfer.py` |
| **Stage 3 (C)** | `routers/booking.py`, `routers/maintenance.py`, `services/booking_service.py`, `services/maintenance_service.py`, `schemas/booking.py`, `schemas/maintenance.py` |
| **Stage 4 (D)** | `routers/audit.py`, `routers/reports.py`, `routers/notifications.py`, `routers/dashboard.py`, `routers/activity_logs.py`, `services/audit_service.py`, `services/report_service.py`, `services/dashboard_service.py`, `services/notifications_service.py` (body only), `services/activity_service.py` (body only), `schemas/audit.py`, `schemas/reports.py`, `schemas/notifications.py`, `schemas/dashboard.py` |
| **Stage 5 (Lead)** | `seed/seed.py`, `frontend/*` |

---

## Appendix A — Cross-Track Dependencies (Frozen Signatures)

These two functions are defined in Stage 0 with stub bodies. Track D fills the bodies. All other tracks import and call them.

```python
# services/activity_service.py — DO NOT CHANGE SIGNATURE
def log(db: Session, actor_id: UUID, action: str,
        entity_type: str | None = None, entity_id: UUID | None = None,
        metadata: dict | None = None) -> None

# services/notifications_service.py — DO NOT CHANGE SIGNATURES
def create(db: Session, recipient_id: UUID | None, type: NotificationType,
           message: str, entity_type: str | None = None,
           entity_id: UUID | None = None) -> None

def sync_derived(db: Session) -> None
```

**Action string namespace** (use these exact strings):
`asset.registered`, `asset.allocated`, `asset.returned`, `asset.transferred`, `asset.status_changed`, `booking.created`, `booking.cancelled`, `maintenance.raised`, `maintenance.approved`, `maintenance.resolved`, `audit.cycle_closed`, `user.role_changed`, `transfer.requested`

---

## Appendix B — Cautions (from team_workflow.txt)

> [!CAUTION]
> - Do NOT invent tables, endpoints, enums, or status transitions not in design.md
> - Do NOT move a file between tracks
> - Do NOT use RLS, Supabase, or any BaaS
> - Do NOT hardcode seed timestamps (always relative to `now()`)
> - Do NOT bypass the DB-level conflict constraints
> - If design.md is ambiguous, flag it in a PR comment — do not silently resolve it
