# =============================================================================
# AutoPilot AI – Self-Healing Supply Chain Platform
# Single multi-stage Dockerfile – all application services built here.
# Infrastructure services (Postgres, Redis, RabbitMQ, Grafana, etc.)
# are pulled from official images in docker-compose.yml.
# =============================================================================

# ─── Shared Python base ───────────────────────────────────────────────────────
FROM python:3.11-slim AS python-base
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl libpq-dev gcc && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

# ─── Backend dependencies ─────────────────────────────────────────────────────
FROM python-base AS backend-deps
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ─── Backend app ──────────────────────────────────────────────────────────────
FROM backend-deps AS backend
WORKDIR /app
COPY backend/ .
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=10s --retries=5 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]

# ─── Worker 1 – Anomaly Detector ─────────────────────────────────────────────
FROM python-base AS worker1-deps
WORKDIR /app
COPY workers/worker1_anomaly/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM worker1-deps AS worker1
WORKDIR /app
COPY workers/shared/ ./shared/
COPY workers/worker1_anomaly/ .
CMD ["python", "main.py"]

# ─── Worker 2 – Self-Healing Orchestrator ────────────────────────────────────
FROM python-base AS worker2-deps
WORKDIR /app
COPY workers/worker2_healing/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM worker2-deps AS worker2
WORKDIR /app
COPY workers/shared/ ./shared/
COPY workers/worker2_healing/ .
CMD ["python", "main.py"]

# ─── Frontend – build stage ───────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json .
RUN npm install
COPY frontend/ .
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ─── Frontend – runtime (Nginx) ───────────────────────────────────────────────
FROM nginx:alpine AS frontend
COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=3 CMD wget -qO- http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
