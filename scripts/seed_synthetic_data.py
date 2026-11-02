#!/usr/bin/env python3
"""
CSC 2.0 Follow-Up Platform — Synthetic Seed Data Generator
Guards: Local test environment ONLY. Refuses non-local databases.
Idempotent: Cleanly resets synthetic records and re-seeds.
Stack: PostgreSQL 16
"""

import sys
import os
import subprocess
import datetime

# --- SAFETY GUARDS ---
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = os.environ.get("DB_PORT", "5432")
DB_NAME = os.environ.get("DB_NAME", "csc2_dev")
DB_USER = os.environ.get("DB_USER", "csc2_app")
DB_PASS = os.environ.get("DB_APP_PASSWORD", "csc2_app_secret_pass")

LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"]
ALLOWED_DBS = ["csc2_dev", "csc2_test", "csc2_local"]

if DB_HOST not in LOCAL_HOSTS:
    print(f"[FATAL GUARD] Seeding refused! DB_HOST '{DB_HOST}' is not a local host.", file=sys.stderr)
    print("This script is strictly restricted to local development environments.", file=sys.stderr)
    sys.exit(1)

if not any(allowed in DB_NAME for allowed in ALLOWED_DBS):
    print(f"[FATAL GUARD] Seeding refused! DB_NAME '{DB_NAME}' does not match allowed dev/test names.", file=sys.stderr)
    sys.exit(1)

if os.environ.get("NODE_ENV") == "production" or os.environ.get("SPRING_PROFILES_ACTIVE") == "prod":
    print("[FATAL GUARD] Seeding refused in production profile!", file=sys.stderr)
    sys.exit(1)

print(f"[SEED GUARD OK] Targeting local database '{DB_NAME}' on {DB_HOST}:{DB_PORT} as user '{DB_USER}'.")

# SQL Script content
SQL_CONTENT = """
-- CSC 2.0 Synthetic Data Seeding (Local Dev & Test Only)
SET search_path TO csc2, public;

BEGIN;

-- 1. CLEAN EXISTING SYNTHETIC DATA IDEMPOTENTLY
DELETE FROM csc2.audit_log WHERE actor_username IN ('fw_delhi_a', 'fw_delhi_b', 'sup_delhi', 'state_rev_delhi', 'admin_national', 'lead_national');
DELETE FROM csc2.outbox WHERE aggregate_type IN ('CLIENT', 'TASK', 'DELIVERED_SERVICE', 'ENCOUNTER');
DELETE FROM csc2.clients WHERE client_ref LIKE 'CSC-DL-%' OR client_ref LIKE 'CSC-MB-%';
DELETE FROM csc2.actors WHERE username IN ('fw_delhi_a', 'fw_delhi_b', 'sup_delhi', 'state_rev_delhi', 'admin_national', 'lead_national');

-- 2. SEED CANONICAL ACTORS (Password: TestPass123!)
-- BCrypt hash for TestPass123! generated via pgcrypto
INSERT INTO csc2.actors (id, actor_ref, username, password_hash, full_name, role, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111101', 'ACT-FW-DL-A', 'fw_delhi_a', crypt('TestPass123!', gen_salt('bf')), 'Ananya Sharma (Field Worker A)', 'field_worker', true),
  ('11111111-1111-1111-1111-111111111102', 'ACT-FW-DL-B', 'fw_delhi_b', crypt('TestPass123!', gen_salt('bf')), 'Ravi Kumar (Field Worker B)', 'field_worker', true),
  ('11111111-1111-1111-1111-111111111103', 'ACT-SUP-DL', 'sup_delhi', crypt('TestPass123!', gen_salt('bf')), 'Dr. Sunita Rao (Supervisor)', 'supervisor', true),
  ('11111111-1111-1111-1111-111111111104', 'ACT-REV-DL', 'state_rev_delhi', crypt('TestPass123!', gen_salt('bf')), 'Vikram Mehta (State Reviewer)', 'state_reviewer', true),
  ('11111111-1111-1111-1111-111111111105', 'ACT-ADM-NAT', 'admin_national', crypt('TestPass123!', gen_salt('bf')), 'Pooja Verma (Administrator)', 'administrator', true),
  ('11111111-1111-1111-1111-111111111106', 'ACT-LED-NAT', 'lead_national', crypt('TestPass123!', gen_salt('bf')), 'Director Rajesh Sen (Leadership)', 'leadership', true);

-- 3. SCOPE ASSIGNMENTS
INSERT INTO csc2.scope_assignments (actor_id, center_id, district, state)
VALUES
  ('11111111-1111-1111-1111-111111111101', 'CENTER_DELHI_01', 'Central Delhi', 'Delhi'),
  ('11111111-1111-1111-1111-111111111102', 'CENTER_DELHI_01', 'Central Delhi', 'Delhi'),
  ('11111111-1111-1111-1111-111111111103', 'CENTER_DELHI_01', 'Central Delhi', 'Delhi'),
  ('11111111-1111-1111-1111-111111111104', 'CENTER_DELHI_01', 'Central Delhi', 'Delhi'),
  ('11111111-1111-1111-1111-111111111104', 'CENTER_MUMBAI_01', 'Mumbai City', 'Maharashtra'),
  ('11111111-1111-1111-1111-111111111105', 'CENTER_DELHI_01', 'Central Delhi', 'Delhi'),
  ('11111111-1111-1111-1111-111111111105', 'CENTER_MUMBAI_01', 'Mumbai City', 'Maharashtra'),
  ('11111111-1111-1111-1111-111111111105', 'ALL', 'National Scope', 'National'),
  ('11111111-1111-1111-1111-111111111106', 'CENTER_DELHI_01', 'Central Delhi', 'Delhi'),
  ('11111111-1111-1111-1111-111111111106', 'CENTER_MUMBAI_01', 'Mumbai City', 'Maharashtra'),
  ('11111111-1111-1111-1111-111111111106', 'ALL', 'National Scope', 'National');

-- 4. SEED 33 SYNTHETIC CLIENTS (18 in Delhi, 15 in Mumbai)
INSERT INTO csc2.clients (
  id, client_ref, center_id, assigned_worker_id, registration_date, client_type,
  full_name, alias_name, age, gender, marital_status, primary_phone, alternate_phone,
  occupation, key_population, address_current, district, state, pincode,
  hiv_status, art_number, art_center_name, art_start_date, cd4_count, cd4_percentage, viral_load_count,
  has_hiv_doc_declaration, has_address_doc_declaration, has_art_doc_declaration, doc_declaration_notes,
  home_visit_consent, messaging_consent, sharing_consent, status, version
) VALUES
  -- Delhi Center (18 clients)
  ('22222222-2222-2222-2222-222222222201', 'CSC-DL-0001', 'CENTER_DELHI_01', '11111111-1111-1111-1111-111111111101', CURRENT_DATE - 120, '1',
   'Aarav Sharma', 'Sonu', 34, 'male', '1', '9811001101', '9811001102', 'daily_wage', 'none', 'House 42, Gali 3, Daryaganj', 'Central Delhi', 'Delhi', '110002',
   'positive', 'DL-LNJP-4021', 'LNJP Hospital ART Centre Delhi', CURRENT_DATE - 110, 420, 24.50, 0,
   true, true, true, 'Original Green Card and Voter ID sighted', true, true, false, 'ACTIVE', 1),

  ('22222222-2222-2222-2222-222222222202', 'CSC-DL-0002', 'CENTER_DELHI_01', '11111111-1111-1111-1111-111111111101', CURRENT_DATE - 90, '1',
   'Priyanka Devi', 'Pinky', 29, 'female', '1', '9811001103', NULL, 'homemaker', 'none', 'Block B, Jahangirpuri', 'North West Delhi', 'Delhi', '110033',
   'positive', 'DL-BSAH-1890', 'Dr. BSA Hospital Rohini Delhi', CURRENT_DATE - 85, 310, 18.20, 150,
   true, true, true, 'Verified ration card and clinical discharge sheet', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222203', 'CSC-DL-0003', 'CENTER_DELHI_01', '11111111-1111-1111-1111-111111111101', CURRENT_DATE - 60, '1',
   'Mohammad Imran', 'Guddu', 41, 'male', '1', '9811001104', '9811001105', 'driver', 'none', 'Kucha Pandit, Lal Kuan', 'Central Delhi', 'Delhi', '110006',
   'positive', 'DL-LNJP-5102', 'LNJP Hospital ART Centre Delhi', CURRENT_DATE - 50, 560, 28.00, 0,
   true, true, true, 'Physical ART card verified', true, false, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222204', 'CSC-DL-0004', 'CENTER_DELHI_01', '11111111-1111-1111-1111-111111111102', CURRENT_DATE - 150, '1',
   'Sunita Kumari', 'Chhoti', 26, 'female', '2', '9811001106', NULL, 'domestic_worker', 'fsw', 'Seelampur Phase 1', 'North East Delhi', 'Delhi', '110053',
   'positive', 'DL-GTB-3311', 'GTB Hospital Shahdara', CURRENT_DATE - 140, 280, 16.00, 480,
   true, true, true, 'Aadhaar physical card sighted', true, true, false, 'ACTIVE', 2),

  ('22222222-2222-2222-2222-222222222205', 'CSC-DL-0005', 'CENTER_DELHI_01', '11111111-1111-1111-1111-111111111102', CURRENT_DATE - 200, '1',
   'Rajesh Verma', 'Raju', 38, 'male', '1', '9811001107', '9811001108', 'shopkeeper', 'none', 'Karol Bagh Market', 'Central Delhi', 'Delhi', '110005',
   'positive', 'DL-RML-2045', 'Dr. RML Hospital Delhi', CURRENT_DATE - 190, 610, 31.00, 0,
   true, true, true, 'Original Green Card verified', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222206', 'CSC-DL-0006', 'CENTER_DELHI_01', '11111111-1111-1111-1111-111111111101', CURRENT_DATE - 45, '1',
   'Kavita Bai', 'Kavi', 32, 'female', '3', '9811001109', NULL, 'tailor', 'none', 'Mangolpuri Block C', 'North West Delhi', 'Delhi', '110083',
   'positive', 'DL-SJR-7821', 'Safdarjung Hospital Delhi', CURRENT_DATE - 40, 390, 22.00, 0,
   true, true, true, 'Voter ID and BPL card sighted', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222207', 'CSC-DL-0007', 'CENTER_DELHI_01', '11111111-1111-1111-1111-111111111102', CURRENT_DATE - 30, '1',
   'Vikram Singh', 'Vicky', 45, 'male', '1', '9811001110', '9811001111', 'mechanic', 'none', 'Shakurpur Village', 'North West Delhi', 'Delhi', '110034',
   'positive', 'DL-LNJP-6670', 'LNJP Hospital ART Centre Delhi', CURRENT_DATE - 25, 210, 12.50, 1200,
   true, true, true, 'Green card sighted; adherence counseling requested', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222208', 'CSC-DL-0008', 'CENTER_DELHI_01', '11111111-1111-1111-1111-111111111101', CURRENT_DATE - 180, '1',
   'Meena Begum', NULL, 36, 'female', '1', '9811001112', NULL, 'homemaker', 'none', 'Ballimaran Chandni Chowk', 'Central Delhi', 'Delhi', '110006',
   'positive', 'DL-LNJP-4420', 'LNJP Hospital ART Centre Delhi', CURRENT_DATE - 170, 480, 26.00, 0,
   true, true, true, 'Verified originals on home visit', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222209', 'CSC-DL-0009', 'CENTER_DELHI_01', '11111111-1111-1111-1111-111111111102', CURRENT_DATE - 15, '1',
   'Deepak Yadav', 'Deepu', 24, 'male', '2', '9811001113', NULL, 'student', 'msm', 'Paharganj Main Bazar', 'Central Delhi', 'Delhi', '110055',
   'positive', 'DL-LHMC-1102', 'Lady Hardinge Medical College', CURRENT_DATE - 10, 520, 27.00, 0,
   true, true, true, 'College ID and ART prescription sighted', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222210', 'CSC-DL-0010', 'CENTER_DELHI_01', '11111111-1111-1111-1111-111111111101', CURRENT_DATE - 210, '1',
   'Shabana Parveen', NULL, 30, 'female', '1', '9811001114', '9811001115', 'artisan', 'none', 'Basti Hazrat Nizamuddin', 'South East Delhi', 'Delhi', '110013',
   'positive', 'DL-AIIMS-0912', 'AIIMS New Delhi', CURRENT_DATE - 200, 340, 19.50, 0,
   true, true, true, 'Physical documentation sighted at intake', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222211', 'CSC-DL-0011', 'CENTER_DELHI_01', '11111111-1111-1111-1111-111111111102', CURRENT_DATE - 75, '1',
   'Kishore Lal', 'Munna', 52, 'male', '1', '9811001116', NULL, 'security_guard', 'none', 'Kalyanpuri Block 12', 'East Delhi', 'Delhi', '110091',
   'positive', 'DL-LBS-3012', 'LBS Hospital Khichripur', CURRENT_DATE - 70, 440, 23.00, 0,
   true, true, true, 'Aadhaar card sighted', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222212', 'CSC-DL-0012', 'CENTER_DELHI_01', '11111111-1111-1111-1111-111111111101', CURRENT_DATE - 300, '1',
   'Pooja Nair', NULL, 28, 'female', '1', '9811001117', '9811001118', 'nurse_aide', 'none', 'Mayur Vihar Phase 1', 'East Delhi', 'Delhi', '110091',
   'positive', 'DL-LNJP-2900', 'LNJP Hospital ART Centre Delhi', CURRENT_DATE - 290, 710, 35.00, 0,
   true, true, true, 'Verified nursing diploma and ART book', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222213', 'CSC-DL-0013', 'CENTER_DELHI_01', '11111111-1111-1111-1111-111111111102', CURRENT_DATE - 110, '1',
   'Sanjay Mishra', 'Sanju', 40, 'male', '1', '9811001119', NULL, 'driver', 'none', 'Badarpur Border', 'South Delhi', 'Delhi', '110044',
   'positive', 'DL-SJR-6644', 'Safdarjung Hospital Delhi', CURRENT_DATE - 100, 310, 18.00, 80,
   true, true, true, 'DL and Green Card verified', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222214', 'CSC-DL-0014', 'CENTER_DELHI_01', '11111111-1111-1111-1111-111111111101', CURRENT_DATE - 250, '1',
   'Anita Gupta', NULL, 33, 'female', '3', '9811001120', '9811001121', 'teacher', 'none', 'Rohini Sector 16', 'North West Delhi', 'Delhi', '110089',
   'positive', 'DL-BSAH-0941', 'Dr. BSA Hospital Rohini Delhi', CURRENT_DATE - 240, 580, 29.00, 0,
   true, true, true, 'Teaching ID and ART card verified', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222215', 'CSC-DL-0015', 'CENTER_DELHI_01', '11111111-1111-1111-1111-111111111102', CURRENT_DATE - 80, '1',
   'Harish Chander', 'Harry', 47, 'male', '1', '9811001122', NULL, 'carpenter', 'none', 'Khirki Village, Malviya Nagar', 'South Delhi', 'Delhi', '110017',
   'positive', 'DL-AIIMS-1290', 'AIIMS New Delhi', CURRENT_DATE - 75, 490, 25.00, 0,
   true, true, true, 'Verified ration card at center', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222216', 'CSC-DL-0016', 'CENTER_DELHI_01', '11111111-1111-1111-1111-111111111101', CURRENT_DATE - 130, '1',
   'Geeta Rani', NULL, 31, 'female', '1', '9811001123', '9811001124', 'vegetable_vendor', 'none', 'Uttam Nagar East', 'West Delhi', 'Delhi', '110059',
   'positive', 'DL-DDU-4421', 'DDU Hospital Hari Nagar', CURRENT_DATE - 120, 350, 20.00, 0,
   true, true, true, 'Aadhaar original sighted', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222217', 'CSC-DL-0017', 'CENTER_DELHI_01', '11111111-1111-1111-1111-111111111102', CURRENT_DATE - 40, '1',
   'Arun Joshi', 'Panditji', 39, 'male', '1', '9811001125', NULL, 'clerk', 'none', 'Shahdara Circular Road', 'Shahdara', 'Delhi', '110032',
   'positive', 'DL-GTB-5100', 'GTB Hospital Shahdara', CURRENT_DATE - 35, 410, 22.50, 0,
   true, true, true, 'Electricity bill and ART book sighted', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222218', 'CSC-DL-0018', 'CENTER_DELHI_01', '11111111-1111-1111-1111-111111111101', CURRENT_DATE - 5, '1',
   'Fatima Khatun', NULL, 27, 'female', '1', '9811001126', '9811001127', 'homemaker', 'none', 'Zakir Nagar, Okhla', 'South East Delhi', 'Delhi', '110025',
   'positive', 'DL-LNJP-7790', 'LNJP Hospital ART Centre Delhi', CURRENT_DATE - 3, 290, 17.00, 520,
   true, true, true, 'Fresh intake documentation sighted', true, true, false, 'ACTIVE', 0),

  -- Mumbai Center (15 clients)
  ('22222222-2222-2222-2222-222222222219', 'CSC-MB-0001', 'CENTER_MUMBAI_01', '11111111-1111-1111-1111-111111111105', CURRENT_DATE - 140, '1',
   'Rohit Kadam', 'Bhai', 35, 'male', '1', '9820002201', '9820002202', 'dock_worker', 'none', 'Kala Chowki, Cotton Green', 'Mumbai City', 'Maharashtra', '400033',
   'positive', 'MH-JJH-3021', 'Sir JJ Hospital ART Centre Mumbai', CURRENT_DATE - 130, 480, 26.00, 0,
   true, true, true, 'Physical Green Card verified', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222220', 'CSC-MB-0002', 'CENTER_MUMBAI_01', '11111111-1111-1111-1111-111111111105', CURRENT_DATE - 110, '1',
   'Shalini Patil', NULL, 30, 'female', '1', '9820002203', NULL, 'garment_worker', 'none', 'Dharavi 90 Feet Road', 'Mumbai Suburban', 'Maharashtra', '400017',
   'positive', 'MH-SION-1829', 'LTMMC Sion Hospital Mumbai', CURRENT_DATE - 100, 360, 21.00, 0,
   true, true, true, 'Ration card and hospital pass sighted', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222221', 'CSC-MB-0003', 'CENTER_MUMBAI_01', '11111111-1111-1111-1111-111111111105', CURRENT_DATE - 85, '1',
   'Ganesh Shinde', 'Ganya', 42, 'male', '1', '9820002204', '9820002205', 'auto_driver', 'none', 'Kurla West Railway Colony', 'Mumbai Suburban', 'Maharashtra', '400070',
   'positive', 'MH-KEM-5510', 'KEM Hospital Parel', CURRENT_DATE - 80, 410, 23.00, 0,
   true, true, true, 'Driving badge and Green Card sighted', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222222', 'CSC-MB-0004', 'CENTER_MUMBAI_01', '11111111-1111-1111-1111-111111111105', CURRENT_DATE - 60, '1',
   'Meenakshi Kamble', NULL, 28, 'female', '3', '9820002206', NULL, 'housekeeping', 'fsw', 'Kamathipura Lane 4', 'Mumbai City', 'Maharashtra', '400008',
   'positive', 'MH-JJH-6601', 'Sir JJ Hospital ART Centre Mumbai', CURRENT_DATE - 50, 270, 15.00, 390,
   true, true, true, 'Aadhaar card sighted', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222223', 'CSC-MB-0005', 'CENTER_MUMBAI_01', '11111111-1111-1111-1111-111111111105', CURRENT_DATE - 190, '1',
   'Suresh Jadhav', 'Surya', 49, 'male', '1', '9820002207', '9820002208', 'fisherman', 'none', 'Versova Koliwada', 'Mumbai Suburban', 'Maharashtra', '400061',
   'positive', 'MH-COOP-2291', 'Cooper Hospital Andheri', CURRENT_DATE - 180, 520, 27.50, 0,
   true, true, true, 'Fisheries society card sighted', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222224', 'CSC-MB-0006', 'CENTER_MUMBAI_01', '11111111-1111-1111-1111-111111111105', CURRENT_DATE - 100, '1',
   'Urmila Solanki', NULL, 33, 'female', '1', '9820002209', NULL, 'cook', 'none', 'Ghatkopar West Bhatwadi', 'Mumbai Suburban', 'Maharashtra', '400084',
   'positive', 'MH-RAJA-1902', 'Rajawadi Hospital Ghatkopar', CURRENT_DATE - 90, 440, 24.00, 0,
   true, true, true, 'Verified ration card', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222225', 'CSC-MB-0007', 'CENTER_MUMBAI_01', '11111111-1111-1111-1111-111111111105', CURRENT_DATE - 40, '1',
   'Nitin Sawant', 'Nitu', 37, 'male', '1', '9820002210', '9820002211', 'electrician', 'none', 'Charni Road Girgaon', 'Mumbai City', 'Maharashtra', '400004',
   'positive', 'MH-GT-3310', 'GT Hospital Mumbai', CURRENT_DATE - 35, 330, 19.00, 110,
   true, true, true, 'Electrician license and ART card sighted', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222226', 'CSC-MB-0008', 'CENTER_MUMBAI_01', '11111111-1111-1111-1111-111111111105', CURRENT_DATE - 220, '1',
   'Zarina Shaikh', NULL, 39, 'female', '1', '9820002212', NULL, 'embroidery', 'none', 'Govandi Shivaji Nagar', 'Mumbai Suburban', 'Maharashtra', '400043',
   'positive', 'MH-SHAT-4412', 'Pt. Madan Mohan Malviya Hospital', CURRENT_DATE - 210, 600, 30.00, 0,
   true, true, true, 'Aadhaar card sighted', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222227', 'CSC-MB-0009', 'CENTER_MUMBAI_01', '11111111-1111-1111-1111-111111111105', CURRENT_DATE - 20, '1',
   'Ajay More', 'Ajju', 26, 'male', '2', '9820002213', '9820002214', 'delivery_partner', 'msm', 'Malad West Marve Road', 'Mumbai Suburban', 'Maharashtra', '400064',
   'positive', 'MH-KEM-8801', 'KEM Hospital Parel', CURRENT_DATE - 15, 380, 21.00, 0,
   true, true, true, 'Verified app partner ID and ART book', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222228', 'CSC-MB-0010', 'CENTER_MUMBAI_01', '11111111-1111-1111-1111-111111111105', CURRENT_DATE - 160, '1',
   'Deepa Chavan', NULL, 31, 'female', '1', '9820002215', NULL, 'beautician', 'none', 'Bhandup Sonapur', 'Mumbai Suburban', 'Maharashtra', '400078',
   'positive', 'MH-SION-5541', 'LTMMC Sion Hospital Mumbai', CURRENT_DATE - 150, 460, 25.00, 0,
   true, true, true, 'Green Card sighted', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222229', 'CSC-MB-0011', 'CENTER_MUMBAI_01', '11111111-1111-1111-1111-111111111105', CURRENT_DATE - 70, '1',
   'Manoj Tawde', 'Babu', 44, 'male', '1', '9820002216', '9820002217', 'peon', 'none', 'Worli BDD Chawls', 'Mumbai City', 'Maharashtra', '400018',
   'positive', 'MH-NAIR-3301', 'BYL Nair Hospital Mumbai', CURRENT_DATE - 65, 510, 27.00, 0,
   true, true, true, 'Government office ID and ART card sighted', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222230', 'CSC-MB-0012', 'CENTER_MUMBAI_01', '11111111-1111-1111-1111-111111111105', CURRENT_DATE - 12, '1',
   'Kiran Gaikwad', NULL, 29, 'female', '2', '9820002218', NULL, 'receptionist', 'tgh', 'Vikhroli Tagore Nagar', 'Mumbai Suburban', 'Maharashtra', '400083',
   'positive', 'MH-JJH-9921', 'Sir JJ Hospital ART Centre Mumbai', CURRENT_DATE - 8, 320, 18.00, 240,
   true, true, true, 'TG card and hospital slip sighted', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222231', 'CSC-MB-0013', 'CENTER_MUMBAI_01', '11111111-1111-1111-1111-111111111105', CURRENT_DATE - 270, '1',
   'Pradeep Salve', 'Paddya', 48, 'male', '1', '9820002219', '9820002220', 'painter', 'none', 'Chembur Camp', 'Mumbai Suburban', 'Maharashtra', '400074',
   'positive', 'MH-SION-7110', 'LTMMC Sion Hospital Mumbai', CURRENT_DATE - 260, 430, 23.00, 0,
   true, true, true, 'Aadhaar and Green Card sighted', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222232', 'CSC-MB-0014', 'CENTER_MUMBAI_01', '11111111-1111-1111-1111-111111111105', CURRENT_DATE - 95, '1',
   'Vaishali Bhoir', NULL, 36, 'female', '1', '9820002221', NULL, 'vegetable_vendor', 'none', 'Mulund Colony', 'Mumbai Suburban', 'Maharashtra', '400082',
   'positive', 'MH-AGAR-1049', 'Agarwal Hospital Mulund', CURRENT_DATE - 85, 390, 22.00, 0,
   true, true, true, 'Ration card sighted', true, true, false, 'ACTIVE', 0),

  ('22222222-2222-2222-2222-222222222233', 'CSC-MB-0015', 'CENTER_MUMBAI_01', '11111111-1111-1111-1111-111111111105', CURRENT_DATE - 18, '1',
   'Mahesh Gokhale', 'Mahi', 34, 'male', '1', '9820002222', '9820002223', 'warehouse_staff', 'none', 'Andheri East Marol Naka', 'Mumbai Suburban', 'Maharashtra', '400059',
   'positive', 'MH-COOP-4411', 'Cooper Hospital Andheri', CURRENT_DATE - 12, 470, 25.50, 0,
   true, true, true, 'Original hospital enrollment documents sighted', true, true, false, 'ACTIVE', 0);

-- 5. SEED FAMILY MEMBERS (B2)
INSERT INTO csc2.family_members (client_id, name, relationship, age, gender, hiv_status, art_number)
VALUES
  ('22222222-2222-2222-2222-222222222201', 'Radha Sharma', 'spouse', 31, 'female', 'positive', 'DL-LNJP-4022'),
  ('22222222-2222-2222-2222-222222222201', 'Ayan Sharma', 'child', 7, 'male', 'negative', NULL),
  ('22222222-2222-2222-2222-222222222202', 'Ramesh Kumar', 'spouse', 33, 'male', 'positive', 'DL-BSAH-1891'),
  ('22222222-2222-2222-2222-222222222202', 'Kiran Kumar', 'child', 5, 'female', 'negative', NULL),
  ('22222222-2222-2222-2222-222222222203', 'Farida Khatun', 'spouse', 38, 'female', 'positive', 'DL-LNJP-5103'),
  ('22222222-2222-2222-2222-222222222204', 'Aanya Kumari', 'child', 4, 'female', 'negative', NULL),
  ('22222222-2222-2222-2222-222222222205', 'Kavita Verma', 'spouse', 35, 'female', 'negative', NULL),
  ('22222222-2222-2222-2222-222222222207', 'Rekha Singh', 'spouse', 42, 'female', 'positive', 'DL-LNJP-6671'),
  ('22222222-2222-2222-2222-222222222208', 'Zubair Beg', 'spouse', 40, 'male', 'positive', 'DL-LNJP-4421'),
  ('22222222-2222-2222-2222-222222222210', 'Tariq Hussain', 'spouse', 34, 'male', 'negative', NULL),
  ('22222222-2222-2222-2222-222222222219', 'Archana Kadam', 'spouse', 32, 'female', 'positive', 'MH-JJH-3022'),
  ('22222222-2222-2222-2222-222222222219', 'Rhea Kadam', 'child', 6, 'female', 'negative', NULL),
  ('22222222-2222-2222-2222-222222222220', 'Tukaram Patil', 'spouse', 34, 'male', 'positive', 'MH-SION-1830'),
  ('22222222-2222-2222-2222-222222222221', 'Swati Shinde', 'spouse', 39, 'female', 'negative', NULL),
  ('22222222-2222-2222-2222-222222222223', 'Sunanda Jadhav', 'spouse', 45, 'female', 'positive', 'MH-COOP-2292');

-- 6. SEED FOLLOW-UP TASKS (DUE TODAY, OVERDUE, UPCOMING, COMPLETED)
-- Canonical J5 purpose codes: 1..13
INSERT INTO csc2.tasks (
  id, task_ref, client_id, assigned_worker_id, center_id,
  task_type, title, description, due_date, status, completed_at, completed_by, version
) VALUES
  -- DUE TODAY (Delhi)
  ('33333333-3333-3333-3333-333333333301', 'TSK-DL-TD-01', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'CENTER_DELHI_01',
   'FOLLOW_UP_VISIT', 'Purpose 01: ART adherence support and pill count verification', 'Routine monthly adherence counseling and pill count check.',
   CURRENT_DATE, 'DUE', NULL, NULL, 0),

  ('33333333-3333-3333-3333-333333333302', 'TSK-DL-TD-02', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111101', 'CENTER_DELHI_01',
   'FOLLOW_UP_VISIT', 'Purpose 04: Viral load testing referral and follow-up', 'Scheduled 6-month viral load sample collection at ART centre.',
   CURRENT_DATE, 'DUE', NULL, NULL, 0),

  ('33333333-3333-3333-3333-333333333303', 'TSK-DL-TD-03', '22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111102', 'CENTER_DELHI_01',
   'FOLLOW_UP_VISIT', 'Purpose 02: Tracking lost to follow up (missed hospital visit)', 'Client missed ART pickup 5 days ago; urgent phone follow-up required.',
   CURRENT_DATE, 'DUE', NULL, NULL, 0),

  -- OVERDUE (Delhi)
  ('33333333-3333-3333-3333-333333333304', 'TSK-DL-OD-01', '22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111101', 'CENTER_DELHI_01',
   'FOLLOW_UP_VISIT', 'Purpose 03: Home visit for treatment adherence and family screening', 'Home visit to assess home environment and family screening consent.',
   CURRENT_DATE - 4, 'OVERDUE', NULL, NULL, 0),

  ('33333333-3333-3333-3333-333333333305', 'TSK-DL-OD-02', '22222222-2222-2222-2222-222222222207', '11111111-1111-1111-1111-111111111102', 'CENTER_DELHI_01',
   'FOLLOW_UP_VISIT', 'Purpose 08: Social protection scheme linkage assistance', 'Linkage to Delhi Antyodaya Anna Yojana scheme.',
   CURRENT_DATE - 3, 'OVERDUE', NULL, NULL, 0),

  -- UPCOMING (Delhi)
  ('33333333-3333-3333-3333-333333333306', 'TSK-DL-UP-01', '22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111102', 'CENTER_DELHI_01',
   'FOLLOW_UP_VISIT', 'Purpose 06: CD4 / routine monitoring consultation', 'Regular 6-monthly CD4 monitoring assessment.',
   CURRENT_DATE + 5, 'PENDING', NULL, NULL, 0),

  ('33333333-3333-3333-3333-333333333307', 'TSK-DL-UP-02', '22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111101', 'CENTER_DELHI_01',
   'FOLLOW_UP_VISIT', 'Purpose 05: Nutrition assessment and supplement distribution', 'Bimonthly nutritional checkup and food kit distribution.',
   CURRENT_DATE + 7, 'PENDING', NULL, NULL, 0),

  -- COMPLETED (Delhi)
  ('33333333-3333-3333-3333-333333333308', 'TSK-DL-CP-01', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'CENTER_DELHI_01',
   'FOLLOW_UP_VISIT', 'Purpose 01: Initial post-intake counseling', 'Completed initial post-registration counseling session.',
   CURRENT_DATE - 20, 'DELIVERED', CURRENT_DATE - 20, '11111111-1111-1111-1111-111111111101', 1),

  -- DUE TODAY (Mumbai)
  ('33333333-3333-3333-3333-333333333309', 'TSK-MB-TD-01', '22222222-2222-2222-2222-222222222219', '11111111-1111-1111-1111-111111111105', 'CENTER_MUMBAI_01',
   'FOLLOW_UP_VISIT', 'Purpose 01: ART adherence and pill count verification', 'Monthly routine ART adherence consultation.',
   CURRENT_DATE, 'DUE', NULL, NULL, 0),

  -- OVERDUE (Mumbai)
  ('33333333-3333-3333-3333-333333333310', 'TSK-MB-OD-01', '22222222-2222-2222-2222-222222222220', '11111111-1111-1111-1111-111111111105', 'CENTER_MUMBAI_01',
   'FOLLOW_UP_VISIT', 'Purpose 02: Missed visit tracking and tracing', 'Follow up on missed ART dispensation at Sion Hospital.',
   CURRENT_DATE - 5, 'OVERDUE', NULL, NULL, 0),

  -- UPCOMING (Mumbai)
  ('33333333-3333-3333-3333-333333333311', 'TSK-MB-UP-01', '22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111105', 'CENTER_MUMBAI_01',
   'FOLLOW_UP_VISIT', 'Purpose 04: Viral load testing referral and follow-up', 'Annual viral load repeat check.',
   CURRENT_DATE + 6, 'PENDING', NULL, NULL, 0);

-- 7. SEED CONTACT ATTEMPTS
INSERT INTO csc2.contact_attempts (task_id, client_id, actor_id, attempt_date, attempt_time, channel, outcome, notes)
VALUES
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', CURRENT_DATE - 1, '10:30:00', 'PHONE', 'reached', 'Beneficiary confirmed adherence. Will attend centre tomorrow.'),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111101', CURRENT_DATE - 2, '14:15:00', 'PHONE', 'not_reached', 'Phone switched off. Plan home visit.'),
  ('33333333-3333-3333-3333-333333333310', '22222222-2222-2222-2222-222222222220', '11111111-1111-1111-1111-111111111105', CURRENT_DATE - 3, '11:00:00', 'PHONE', 'reached', 'Beneficiary was out of station. Promised to visit ART centre by end of week.');

-- 8. SEED ENCOUNTERS (Section I)
INSERT INTO csc2.encounters (id, client_id, actor_id, task_id, observation_date, encounter_type, art_adherence_assessment, nutrition_assessment, mental_health_notes, general_notes)
VALUES
  ('44444444-4444-4444-4444-444444444401', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333308', CURRENT_DATE - 20, 'CSC_VISIT', 'GOOD (>95%)', 'NORMAL', 'No anxiety reported', 'Initial counseling conducted. Patient motivated to adhere.'),
  ('44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111102', NULL, CURRENT_DATE - 35, 'HOME_VISIT', 'FAIR (80-95%)', 'MODERATE_MALNUTRITION', 'Mild workplace distress', 'Home visit conducted. Pill box provided. Advised nutrition supplements.');

-- 9. SEED PLANNED SERVICES (J5)
INSERT INTO csc2.planned_services (id, client_id, task_id, service_code, service_name, target_due_date, status, notes)
VALUES
  ('55555555-5555-5555-5555-555555555501', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', '1', 'Adherence Support & Verification', CURRENT_DATE, 'PLANNED', 'Monthly adherence check'),
  ('55555555-5555-5555-5555-555555555502', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333302', '4', 'Viral Load Referral Assistance', CURRENT_DATE, 'PLANNED', 'Coordinate with hospital lab'),
  ('55555555-5555-5555-5555-555555555503', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333308', '1', 'Adherence Support & Verification', CURRENT_DATE - 20, 'DELIVERED', 'Delivered during intake follow-up');

-- 10. SEED DELIVERED SERVICES
INSERT INTO csc2.delivered_services (id, planned_service_id, client_id, delivered_by, task_id, delivery_date, service_code, facility_name, notes)
VALUES
  ('66666666-6666-6666-6666-666666666601', '55555555-5555-5555-5555-555555555503', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', '33333333-3333-3333-3333-333333333308', CURRENT_DATE - 20, '1', 'LNJP Hospital ART Centre Delhi', 'Adherence counseling completed.');

COMMIT;
"""

def main():
    sql_path = os.path.join(os.path.dirname(__file__), "seed_synthetic_data.sql")
    with open(sql_path, "w", encoding="utf-8") as f:
        f.write(SQL_CONTENT.strip())
    print(f"[SEED] Generated SQL file: {sql_path}")

    # Find psql
    psql_candidates = [
        r"C:\Program Files\PostgreSQL\16\bin\psql.exe",
        r"C:\Program Files\PostgreSQL\15\bin\psql.exe",
        r"C:\Program Files\PostgreSQL\14\bin\psql.exe",
        "psql"
    ]
    psql_exe = None
    for cand in psql_candidates:
        if os.path.isfile(cand) or cand == "psql":
            psql_exe = cand
            break

    if not psql_exe:
        print("[ERROR] psql executable not found in standard paths.", file=sys.stderr)
        sys.exit(1)

    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASS

    cmd = [
        psql_exe,
        "-h", DB_HOST,
        "-p", DB_PORT,
        "-U", DB_USER,
        "-d", DB_NAME,
        "-f", sql_path
    ]

    print(f"[SEED] Running {psql_exe} to seed synthetic data...")
    res = subprocess.run(cmd, env=env, capture_output=True, text=True)

    if res.returncode != 0 or "ERROR:" in res.stderr or "ERROR:" in res.stdout:
        print(f"[ERROR] psql failed:\n{res.stdout}\n{res.stderr}", file=sys.stderr)
        sys.exit(1)

    print(res.stdout)

    # Verification query
    verify_sql = """
    SELECT 
      (SELECT count(*) FROM csc2.actors) AS actors,
      (SELECT count(*) FROM csc2.clients) AS clients,
      (SELECT count(*) FROM csc2.family_members) AS family_members,
      (SELECT count(*) FROM csc2.tasks) AS tasks,
      (SELECT count(*) FROM csc2.tasks WHERE status = 'DUE') AS tasks_due,
      (SELECT count(*) FROM csc2.tasks WHERE status = 'OVERDUE') AS tasks_overdue,
      (SELECT count(*) FROM csc2.tasks WHERE status = 'PENDING') AS tasks_upcoming,
      (SELECT count(*) FROM csc2.encounters) AS encounters,
      (SELECT count(*) FROM csc2.delivered_services) AS delivered_services;
    """
    v_cmd = [
        psql_exe,
        "-h", DB_HOST,
        "-p", DB_PORT,
        "-U", DB_USER,
        "-d", DB_NAME,
        "-c", verify_sql
    ]
    v_res = subprocess.run(v_cmd, env=env, capture_output=True, text=True)
    print("=== SEEDING VERIFICATION COUNTS ===")
    print(v_res.stdout)
    print("[SUCCESS] Local synthetic seed completed successfully.")

if __name__ == "__main__":
    main()
