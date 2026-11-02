# Multi-stage Dockerfile for CSC 2.0 Spring Boot Authority Backend

# Stage 1: Build artifact
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

# Copy Maven wrapper / POM and resolve dependencies
COPY pom.xml .
COPY src ./src

RUN ./mvnw clean package -DskipTests 2>/dev/null || mvn clean package -DskipTests

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

# Optimized JVM memory flags
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError -XX:+UseG1GC -Djava.security.egd=file:/dev/./urandom"
ENV PORT=8080
EXPOSE 8080

# Healthcheck probe using actuator endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
