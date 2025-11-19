# ---- Stage 1: Build ----
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy toàn bộ source code vào
COPY . .

# Chạy lệnh package trực tiếp (bỏ qua test để build nhanh hơn)
# Maven sẽ tự động tải tất cả dependencies cần thiết bao gồm cả Lombok
RUN mvn clean package -DskipTests

# ---- Stage 2: Run ----
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]