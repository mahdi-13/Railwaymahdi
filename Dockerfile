# استفاده از نسخه‌ی سبک Node.js 20
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY server.js .

# پورت 8080 (همان مقداری که Cloud Run انتظار دارد)
EXPOSE 8080

CMD ["node", "server.js"]
