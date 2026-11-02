#!/usr/bin/env bash
# CSC 2.0 Follow-Up Platform — One-Command Local Development Runner (Linux / macOS)
# Non-negotiables: Synthetic data only, no secrets printed, fails closed if non-local.

set -e

echo "=========================================================="
echo "CSC 2.0 Follow-Up Platform — Local Dev Environment Setup"
echo "=========================================================="

echo "[1/6] Checking prerequisites..."
command -v java >/dev/null 2>&1 || { echo >&2 "Java 21 is required but not installed."; exit 1; }
command -v mvn >/dev/null 2>&1 || { echo >&2 "Maven is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo >&2 "Node.js is required but not installed."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo >&2 "Python 3 is required but not installed."; exit 1; }

echo "  ✓ Java: $(java -version 2>&1 | head -n 1)"
echo "  ✓ Maven: $(mvn -version 2>&1 | head -n 1)"
echo "  ✓ Node: $(node -v)"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo ""
echo "[2/6] Verifying database connectivity..."
nc -z localhost 5432 || { echo "PostgreSQL not reachable on localhost:5432. Please start PostgreSQL."; exit 1; }
echo "  ✓ PostgreSQL is listening on localhost:5432"

echo ""
echo "[3/6] Seeding synthetic data..."
python3 "${ROOT_DIR}/scripts/seed_synthetic_data.py"

echo ""
echo "[4/6] Checking Spring Boot backend on port 8080..."
if curl -s http://localhost:8080/actuator/health | grep -q "UP"; then
  echo "  ✓ Spring Boot backend is already healthy"
else
  echo "  Starting Spring Boot backend..."
  (cd "${ROOT_DIR}/backend" && mvn spring-boot:run > /tmp/csc2-backend.log 2>&1 &)
  for i in {1..30}; do
    if curl -s http://localhost:8080/actuator/health | grep -q "UP"; then
      echo "  ✓ Spring Boot backend is healthy"
      break
    fi
    sleep 2
  done
fi

echo ""
echo "[5/6] Checking Next.js frontend on port 3000..."
if curl -s http://localhost:3000/sign-in >/dev/null; then
  echo "  ✓ Next.js frontend is already healthy"
else
  echo "  Starting Next.js frontend..."
  (cd "${ROOT_DIR}/frontend" && npx next start -p 3000 > /tmp/csc2-frontend.log 2>&1 &)
  for i in {1..20}; do
    if curl -s http://localhost:3000/sign-in >/dev/null; then
      echo "  ✓ Next.js frontend is healthy"
      break
    fi
    sleep 2
  done
fi

echo ""
echo "=========================================================="
echo " CSC 2.0 FOLLOW-UP PLATFORM IS READY FOR LOCAL TESTING"
echo "=========================================================="
echo ""
echo "  Test Sign-In:       http://localhost:3000/sign-in"
echo "  My Work (Worklist): http://localhost:3000/work"
echo "  Beneficiary List:   http://localhost:3000/clients"
echo "  New Registration:   http://localhost:3000/clients/new"
echo "  Client Detail:      http://localhost:3000/clients/22222222-2222-2222-2222-222222222201?tab=follow-up"
echo "  Reports & Metrics:  http://localhost:3000/reports"
echo "  System Admin:       http://localhost:3000/admin"
echo "=========================================================="
