# ──────────────────────────────────────────────────────────────────────────────
# AssetFlow API — Dockerfile
# Multi-stage: builder installs deps, final image is lean.
# ──────────────────────────────────────────────────────────────────────────────

FROM python:3.12-slim AS builder

WORKDIR /app

# Install build deps for psycopg2 etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ──────────────────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS final

WORKDIR /app

# Runtime deps only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY . .

EXPOSE 8000

# Run migrations then start the server
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
