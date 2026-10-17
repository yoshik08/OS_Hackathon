-- ============================================================================
-- RaktaSetu — MySQL 8 schema
-- Blood Bank Management System: donor / hospital / admin portals
--
-- How to use (on your laptop, in MySQL Workbench):
--   1. Open this file in Workbench and run it (lightning icon).
--   2. It creates the `raktasetu` database with all tables + the inventory view.
--   3. Seed data comes later as a separate seed.sql (kept apart on purpose).
-- ============================================================================

CREATE DATABASE IF NOT EXISTS raktasetu
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE raktasetu;

-- ----------------------------------------------------------------------------
-- Users & auth — one row per login. `role` decides which portal they land in.
-- Hospitals sign in with their hospital ID (hospitals.id); everyone else
-- uses email/username. The backend resolves the profile from here.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL,
  username      VARCHAR(60),
  password_hash VARCHAR(255) NOT NULL,          -- bcrypt hash, never plaintext
  role          ENUM('donor','hospital','admin') NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Donors — profile row per donor account. IDs look like DNR-1042.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donors (
  id                 VARCHAR(16) PRIMARY KEY,   -- e.g. DNR-1042
  user_id            INT UNIQUE,
  blood_group        ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  city               VARCHAR(80),
  phone              VARCHAR(20),
  date_of_birth      DATE,
  last_donation_date DATE,
  total_donations    INT NOT NULL DEFAULT 0,
  latitude           DECIMAL(10, 7) NULL,       -- for "nearby requests" distance
  longitude          DECIMAL(10, 7) NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_donors_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Hospitals — profile row per hospital account. IDs look like HSP-1024.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hospitals (
  id         VARCHAR(16) PRIMARY KEY,           -- e.g. HSP-1024
  user_id    INT UNIQUE,
  name       VARCHAR(150) NOT NULL,
  location   VARCHAR(150),
  phone      VARCHAR(20),
  latitude   DECIMAL(10, 7) NULL,               -- for "nearby requests" distance
  longitude  DECIMAL(10, 7) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hospitals_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Blood stock — tracked as EXPIRY-AWARE batches (one row per collection batch),
-- not as a single counter. This is what makes "expiry-aware stock control"
-- real: every unit knows when it was collected and when it expires.
-- Whole blood shelf life ~= 35-42 days; the API treats batches expiring
-- within 3 days as "near expiry".
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blood_batches (
  id             VARCHAR(16) PRIMARY KEY,       -- e.g. BAT-5001
  blood_group    ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  units          INT NOT NULL,
  collected_date DATE NOT NULL,
  expiry_date    DATE NOT NULL,
  status         ENUM('available','reserved','expired','discarded') NOT NULL DEFAULT 'available',
  source_type    ENUM('donation','camp') NULL,  -- where the blood came from
  source_id      VARCHAR(16) NULL,              -- donation id or camp id
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_batches_units CHECK (units >= 0),
  CONSTRAINT chk_batches_dates CHECK (expiry_date >= collected_date),
  INDEX idx_batches_group_status (blood_group, status),
  INDEX idx_batches_expiry (expiry_date)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Hospital blood requests — the request workflow.
-- IDs look like REQ-7731. `units_fulfilled` tracks partial fulfilment.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blood_requests (
  id              VARCHAR(16) PRIMARY KEY,      -- e.g. REQ-7731
  hospital_id     VARCHAR(16) NOT NULL,
  blood_group     ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  units_needed    INT NOT NULL,
  units_fulfilled INT NOT NULL DEFAULT 0,
  urgency         ENUM('Routine','Urgent','Critical') NOT NULL DEFAULT 'Routine',
  status          ENUM('Pending','Matching','Matched','Fulfilled','Cancelled') NOT NULL DEFAULT 'Pending',
  patient_name    VARCHAR(100),
  ward            VARCHAR(50),
  notes           TEXT,
  raised_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fulfilled_at    TIMESTAMP NULL,
  CONSTRAINT chk_requests_units CHECK (units_needed > 0),
  CONSTRAINT chk_requests_fulfilled CHECK (units_fulfilled >= 0 AND units_fulfilled <= units_needed),
  CONSTRAINT fk_requests_hospital FOREIGN KEY (hospital_id)
    REFERENCES hospitals (id) ON DELETE RESTRICT,
  INDEX idx_requests_status (status),
  INDEX idx_requests_hospital (hospital_id),
  INDEX idx_requests_group (blood_group)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Donations — every donor's donation history (drives the donor "History" page
-- and the 3-lives-per-donation impact stat).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donations (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  donor_id      VARCHAR(16) NOT NULL,
  donation_date DATE NOT NULL,
  location      VARCHAR(150),
  units         INT NOT NULL DEFAULT 1,
  status        ENUM('Completed','Scheduled','Cancelled') NOT NULL DEFAULT 'Completed',
  request_id    VARCHAR(16) NULL,              -- filled when donated against a request
  batch_id      VARCHAR(16) NULL,              -- stock batch this donation created
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_donations_donor FOREIGN KEY (donor_id)
    REFERENCES donors (id) ON DELETE CASCADE,
  CONSTRAINT fk_donations_request FOREIGN KEY (request_id)
    REFERENCES blood_requests (id) ON DELETE SET NULL,
  INDEX idx_donations_donor_date (donor_id, donation_date)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Camps — donation camp management. IDs look like CAMP-301.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS camps (
  id              VARCHAR(16) PRIMARY KEY,      -- e.g. CAMP-301
  name            VARCHAR(150) NOT NULL,
  location        VARCHAR(200) NOT NULL,
  organizer       VARCHAR(150),
  camp_date       DATE NOT NULL,
  time_slot       VARCHAR(50),
  status          ENUM('Upcoming','Ongoing','Completed','Cancelled') NOT NULL DEFAULT 'Upcoming',
  expected_donors INT NULL,
  units_collected INT NULL,
  contact_phone   VARCHAR(20),
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_camps_date (camp_date),
  INDEX idx_camps_status (status)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Cross-match records — compatibility test results. IDs look like CM-2041.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crossmatch_records (
  id              VARCHAR(16) PRIMARY KEY,      -- e.g. CM-2041
  donor_id        VARCHAR(16) NULL,
  donor_name      VARCHAR(100),
  donor_group     ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NULL,
  recipient_name  VARCHAR(100),
  recipient_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NULL,
  abo_compat      ENUM('Compatible','Incompatible') NULL,
  rh_compat       ENUM('Compatible','Incompatible') NULL,
  antibody_screen VARCHAR(100),
  result          ENUM('Compatible','Incompatible') NOT NULL,
  tested_by       VARCHAR(100),
  request_id      VARCHAR(16) NULL,
  tested_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_crossmatch_donor FOREIGN KEY (donor_id)
    REFERENCES donors (id) ON DELETE SET NULL,
  CONSTRAINT fk_crossmatch_request FOREIGN KEY (request_id)
    REFERENCES blood_requests (id) ON DELETE SET NULL,
  INDEX idx_crossmatch_result (result)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Alerts — low-stock / expiry / critical-request warnings for the admin.
-- IDs look like ALT-01.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
  id          VARCHAR(16) PRIMARY KEY,          -- e.g. ALT-01
  type        VARCHAR(80) NOT NULL,             -- e.g. 'Low stock', 'Expiring soon'
  detail      TEXT NOT NULL,
  severity    ENUM('Info','Warning','Critical') NOT NULL DEFAULT 'Info',
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  raised_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  INDEX idx_alerts_severity (severity, is_resolved)
) ENGINE=InnoDB;

-- ============================================================================
-- VIEW: v_inventory — expiry-aware stock summary, one row per blood group.
-- This is what the frontend's Inventory page reads:
--   units           = total available units right now
--   near_expiry     = available units expiring within 3 days
--   earliest_expiry = soonest expiry date among available batches
-- ============================================================================
CREATE OR REPLACE VIEW v_inventory AS
SELECT
  blood_group,
  SUM(CASE WHEN status = 'available' THEN units ELSE 0 END) AS units,
  SUM(CASE WHEN status = 'available' AND expiry_date <= CURDATE() + INTERVAL 3 DAY
           THEN units ELSE 0 END) AS near_expiry_units,
  MIN(CASE WHEN status = 'available' THEN expiry_date END) AS earliest_expiry
FROM blood_batches
GROUP BY blood_group;

-- ============================================================================
-- Done. Sanity check after running:
--   SHOW TABLES;            -- expect 8 tables
--   SELECT * FROM v_inventory; -- empty until seed data arrives (next phase)
-- ============================================================================
