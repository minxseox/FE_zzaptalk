# 1단계: 빌드
FROM node:20-alpine as builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# 🔥 build-time 환경변수 받기
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

# Expo web 정적 파일 빌드
RUN npx expo export -p web

# ------------------------------------------------

# 2단계: 실행 (nginx)
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
