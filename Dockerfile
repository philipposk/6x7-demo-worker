# Playwright base image ships Chromium + all browser system deps + Node.
FROM mcr.microsoft.com/playwright:v1.60.0-noble

# ffmpeg (video encode), git (track main), zip (screenshot bundles).
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg git zip ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV TOOLS_DIR=/tools
RUN mkdir -p /tools
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

# The two tool repos are cloned + pulled to latest main at runtime (lib/repos).
CMD ["node", "worker.mjs"]
