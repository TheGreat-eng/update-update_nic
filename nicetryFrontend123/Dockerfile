# ---- Stage 1: Build React App ----
FROM node:20.19-alpine AS build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Xóa cache npm, đảm bảo cài mới hoàn toàn
RUN npm cache clean --force

# Cài dependencies sạch
RUN npm install --no-audit --no-fund --force

# Copy source code
COPY . .

# Cài lại esbuild đúng bản (fix mismatch)
RUN npm rebuild esbuild

# Build app
RUN npm run build

# ---- Stage 2: Serve with Nginx ----
FROM nginx:1.25-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
