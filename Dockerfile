FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .

# 🔥 .env 파일 직접 생성
RUN echo "EXPO_PUBLIC_API_BASE=/api" > .env && \
    echo "EXPO_PUBLIC_WS_BASE=/ws" >> .env && \
    echo "EXPO_PUBLIC_APP_ENV=production" >> .env

RUN npx expo export -p web

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]