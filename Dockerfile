# 1단계: Expo Web 빌드
FROM node:20-alpine as builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npx expo export -p web

# --------------------------
# 2단계: NGINX 이미지
# --------------------------
FROM nginx:alpine

# 템플릿 파일 복사 (templates 폴더가 아닌 임시 위치로!)
COPY nginx.conf /etc/nginx/nginx.conf.template

# 빌드된 정적 파일 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# 🔥 핵심: 직접 envsubst 실행하는 entrypoint 스크립트 생성
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'envsubst "\$API_URL \$WS_URL" < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]