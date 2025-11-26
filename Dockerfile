# 1단계: 빌드
FROM node:20-alpine as builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Expo 표준 환경 변수 (선택)
ARG EXPO_PUBLIC_API_BASE
ENV EXPO_PUBLIC_API_BASE=${EXPO_PUBLIC_API_BASE}

# Expo web 정적 빌드
RUN npx expo export -p web

# ------------------------------------------------

# 2단계: 실행 (nginx)
FROM nginx:alpine

# Nginx 템플릿 복사
COPY nginx.conf /etc/nginx/templates/default.conf.template

# 빌드 결과 복사
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
