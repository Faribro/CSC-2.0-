-- scripts/db_grant_permissions.sql
-- Run against csc2_dev and csc2_test

CREATE SCHEMA IF NOT EXISTS csc2 AUTHORIZATION csc2_migration;

-- Grant USAGE to application role
GRANT USAGE ON SCHEMA csc2 TO csc2_app;

-- Default permissions for tables created by csc2_migration in csc2 schema
ALTER DEFAULT PRIVILEGES FOR ROLE csc2_migration IN SCHEMA csc2
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO csc2_app;

ALTER DEFAULT PRIVILEGES FOR ROLE csc2_migration IN SCHEMA csc2
    GRANT USAGE, SELECT ON SEQUENCES TO csc2_app;

-- Also grant on existing tables/sequences if any
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA csc2 TO csc2_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA csc2 TO csc2_app;

-- REVOKE DDL rights (CREATE, ALTER, DROP) from csc2_app
REVOKE CREATE ON SCHEMA csc2 FROM csc2_app;
