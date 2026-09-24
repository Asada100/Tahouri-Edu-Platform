FROM node:24-bookworm-slim
WORKDIR /app
COPY services/license-api/package.json ./services/license-api/package.json
COPY services/license-api/*.js ./services/license-api/
COPY services/license-api/admin ./services/license-api/admin
ENV NODE_ENV=production
ENV PORT=8787
ENV HOST=0.0.0.0
EXPOSE 8787
CMD ["node", "services/license-api/server.js"]
