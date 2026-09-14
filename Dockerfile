FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM python:3.12-slim-bookworm
ENV HOST=0.0.0.0 PORT=3001
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends poppler-utils \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock
COPY --from=build /app/dist ./dist
COPY python_backend ./python_backend
COPY config ./config
COPY knowledge ./knowledge
RUN useradd --create-home --uid 10001 app \
    && mkdir -p /app/data/visual-attachments \
    && chown -R app:app /app
USER app
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=6 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:3001/api/health', timeout=4)"
CMD ["python", "-m", "uvicorn", "python_backend.app:app", "--host", "0.0.0.0", "--port", "3001"]
