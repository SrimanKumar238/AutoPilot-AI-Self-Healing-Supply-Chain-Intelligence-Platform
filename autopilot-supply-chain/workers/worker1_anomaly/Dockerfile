FROM python:3.12-slim

WORKDIR /app/worker1

RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY ../shared /app/shared

ENV PYTHONPATH=/app

CMD ["python", "main.py"]
