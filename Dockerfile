# 1단계: 빌드
FROM node:20-alpine as builder
WORKDIR /app

# yarn.lock 대신 package-lock.json 복사
COPY package.json package-lock.json ./

# yarn install 대신 npm install 실행
RUN npm install

COPY . .
RUN npx expo export -p web

# ------------------------------------------------

# 2단계: 실행
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]