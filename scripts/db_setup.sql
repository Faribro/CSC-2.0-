-- scripts/db_setup.sql
-- Setup roles and isolated databases for CSC 2.0 Follow-Up Platform

-- Create migration role (DDL rights)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'csc2_migration') THEN
        CREATE ROLE csc2_migration WITH LOGIN PASSWORD 'csc2_migration_secret_pass';
    END IF;
END $$;

-- Create application role (DML only)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'csc2_app') THEN
        CREATE ROLE csc2_app WITH LOGIN PASSWORD 'csc2_app_secret_pass';
    END IF;
END $$;

-- Create csc2_dev database if not exists
SELECT 'CREATE DATABASE csc2_dev OWNER csc2_migration'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'csc2_dev')\gexec

-- Create csc2_test database if not exists
SELECT 'CREATE DATABASE csc2_test OWNER csc2_migration'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'csc2_test')\gexec
