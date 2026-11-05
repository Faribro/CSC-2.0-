# Multi-stage Dockerfile for CSC 2.0 Spring Boot Authority Backend (Render & Container Environments)

# Stage 1: Build artifact
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /workspace

# Copy Maven POM and source
COPY pom.xml .
COPY src ./src

RUN mvn clean package -DskipTests

# Stage 2: Minimal runtime image
FROM eclipse-temurin:21-jre-alpine AS runner
WORKDIR /app

# Install curl for container health check
RUN apk add --no-cache curl

# Create non-root system user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built jar from builder
COPY --from=builder /workspace/target/*.jar /app/app.jar

# Enforce non-root ownership
RUN chown -R appuser:appgroup /app
USER appuser:appgroup

# Optimized JVM memory flags for small/free cloud instances (512MB RAM budget)
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70.0 -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"
ENV PORT=8080
EXPOSE 8080

# Healthcheck probe using minimal public /healthz endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/healthz || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
