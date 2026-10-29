# Imagen de ArrowOps construida a partir del artefacto del CI (npm pack).
# Se despliega exactamente el .tgz que paso las pruebas: no se vuelve a compilar desde el codigo.
#   docker build -f devops/deploy/Dockerfile -t arrowops:<version> <carpeta-con-el-tgz>
FROM node:22-alpine

WORKDIR /app

COPY arrowops-*.tgz /tmp/
RUN npm install --omit=dev --no-audit --no-fund /tmp/arrowops-*.tgz \
    && rm /tmp/arrowops-*.tgz \
    && npm cache clean --force

ENV NODE_ENV=production \
    PORT=3000

# Sin privilegios de root dentro del contenedor.
USER node

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
    CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "node_modules/arrowops/backend/src/server.js"]
