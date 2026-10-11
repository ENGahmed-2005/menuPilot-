# The auth service as a container (Render "Docker" web service, or any host).
# Railway builds the same folder with Railpack: npm start.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
USER node
EXPOSE 3005
CMD ["node", "src/server.js"]
