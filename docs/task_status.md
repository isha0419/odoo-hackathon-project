# AssetFlow — Team Task Status

> Last updated: 2026-07-12 11:20 IST
> Stage assignment source of truth: `design.md` Section 12

---

## 🅰️ Omm — Lead / Backend Integration (Track A)

- [x] Stage 0 — Foundation & Skeleton
  - [x] Docker Compose + Postgres 16 + config
  - [x] 13 SQLAlchemy models + 12 enums
  - [x] Alembic migration (tables, CJ constraints, sequences)
  - [x] `security.py`, `deps.py`, shared service stubs
  - [x] 12 router stubs registered in `main.py`
  - [x] Dockerfile + root `docker-compose.yml` (api + postgres)
- [x] Stage 1 — Auth + Organization
  - [x] Auth: signup, login, /me, forgot-password
  - [x] Org: departments CRUD, categories CRUD
  - [x] Employee directory + admin-only role promotion
  - [x] Seed script (admin user, 4 depts, 5 categories)
  - [x] All gate tests passed
- [ ] Stage 4 — Integration, Final Seed & Polish
  - [ ] Full demo seed (Section 13 spec: Field Ops hierarchy, Spaces, etc.)
  - [ ] Cross-track integration testing
  - [ ] Final merge coordination

---

## 🅱️ Satya — Backend Track B

- [ ] Stage 2 — Asset Registry + Allocation + Transfer *(Crown Jewel #1)*
  - [ ] Asset CRUD (register, tag, lifecycle transitions)
  - [ ] Allocation service (assign/return, CJ #1 enforcement)
  - [ ] Transfer request workflow (pending → approved → completed)
  - [ ] `GET /assets`, `POST /allocations`, `POST /transfers` endpoints
- [ ] Stage 3 — Booking + Maintenance + Audit + Reports
  - [ ] Booking service + calendar endpoint *(Crown Jewel #2)*
  - [ ] Maintenance service (Kanban: open → in_progress → resolved)
  - [ ] Audit cycle service + discrepancy reports
  - [ ] Reports & Dashboard KPI endpoints

---

## 🅲 Yash — Frontend Track C

- [ ] Stage 3C — Core UI Pages
  - [ ] Auth pages (Login / Signup)
  - [ ] Layout shell + sidebar navigation
  - [ ] Org setup (Departments, Categories)
  - [ ] Asset Registry (table + register form)
  - [ ] Employee Directory

---

## 🅳 Isha — Frontend Track D

- [ ] Stage 3D — Feature UI Pages
  - [ ] Booking Calendar view
  - [ ] Maintenance Kanban board
  - [ ] Audit Cycle wizard
  - [ ] Reports & Charts
  - [ ] Dashboard KPIs

---

> **Notes**
> - Stages 0+1 pushed directly to `main` as one-time bootstrap — **all further work via PR**.
> - `seed/initial_seed.py` is a dev bootstrap only; final demo seed per Section 13 is a Stage 4 deliverable.
> - Backend `docker-compose.yaml` (under `backend/`) is DB-only for local dev; root `docker-compose.yml` boots full stack.
