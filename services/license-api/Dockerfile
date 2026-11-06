FROM node:24-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssh-client \
    && mkdir -p /data /backups \
    && chown -R node:node /data /backups \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --chown=node:node services/license-api/package.json ./services/license-api/package.json
COPY --chown=node:node services/license-api/*.js ./services/license-api/
COPY --chown=node:node services/license-api/admin ./services/license-api/admin

ENV NODE_ENV=production
ENV PORT=8787
ENV HOST=0.0.0.0

USER node

EXPOSE 8787

CMD ["node", "services/license-api/server.js"]
