# 1단계: Expo Web 빌드
FROM node:20-alpine as builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Expo Web 빌드 (dist 폴더 생성)
RUN npx expo export -p web

# --------------------------
# 2단계: NGINX 이미지
# --------------------------
FROM nginx:alpine

# 템플릿으로 사용할 설정 파일 복사
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# 빌드된 정적 파일 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# 🔥 핵심: 치환할 환경 변수만 명시 (NGINX 내장 변수 보호)
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx/conf.d
ENV NGINX_ENVSUBST_TEMPLATE_SUFFIX=.template
ENV NGINX_ENVSUBST_FILTER=API_URL,WS_URL

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]