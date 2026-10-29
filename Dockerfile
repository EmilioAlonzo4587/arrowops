# Imagen de ArrowOps construida desde el codigo fuente (docker compose en la raiz).
# Reproduce el mismo empaquetado del CI: npm pack -> instalar solo dependencias de produccion.
# El pipeline usa devops/deploy/Dockerfile, que parte del .tgz ya probado por el CI.

# Etapa 1: empaquetar como lo hace el CI (respeta el campo "files" de package.json).
FROM node:22-alpine AS pack
WORKDIR /src
COPY package.json package-lock.json README.md ./
COPY backend ./backend
COPY frontend ./frontend
RUN npm pack

# Etapa 2: imagen final, igual a la del pipeline.
FROM node:22-alpine
WORKDIR /app
COPY --from=pack /src/arrowops-*.tgz /tmp/
RUN npm install --omit=dev --no-audit --no-fund /tmp/arrowops-*.tgz \
    && rm /tmp/arrowops-*.tgz \
    && npm cache clean --force

ENV NODE_ENV=production \
    PORT=3000

USER node
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
    CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "node_modules/arrowops/backend/src/server.js"]
