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

# 루트의 nginx.conf 를 템플릿으로 사용
COPY nginx.conf /etc/nginx/templates/default.conf.template

# 빌드된 정적 파일 복사
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
