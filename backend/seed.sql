-- ============================================================================
-- RaktaSetu — demo seed data
-- Run ONCE, after schema.sql, in MySQL Workbench (whole script, top to bottom).
--
-- Every date is relative to CURDATE()/NOW(), so the demo always looks alive
-- no matter when you run it: stock has staggered expiries, requests were
-- raised "hours ago", and history stretches back ~2 years for the reports.
--
-- Demo logins (password for ALL of them: password123)
--   Donor:    ananya@example.com
--   Hospital: HSP-1024            (Yashoda Hospital — the login uses the ID)
--   Admin:    admin@raktasetu.in
-- ============================================================================

USE raktasetu;

-- All demo accounts share one bcrypt hash, for the password "password123".
SET @demo_pw = '$2a$10$7QkQ9n8fg3kexGBpfwlEwu3qdrlN75PYClfD5ex0OQIVqGk2t1OKO';

-- ----------------------------------------------------------------------------
-- Users
-- ----------------------------------------------------------------------------
INSERT INTO users (name, email, username, password_hash, role) VALUES
  ('Ananya Rao',   'ananya@example.com', 'ananya_rao', @demo_pw, 'donor'),
  ('Vikram Shetty','vikram@example.com', 'vikram_s',   @demo_pw, 'donor'),
  ('Farah Khan',   'farah@example.com',  'farah_k',    @demo_pw, 'donor'),
  ('Rohit Menon',  'rohit@example.com',  'rohit_m',    @demo_pw, 'donor'),
  ('Priya Nair',   'priya@example.com',  'priya_n',    @demo_pw, 'donor'),
  ('Yashoda Hospital',     'yashoda@hospital.in',     NULL, @demo_pw, 'hospital'),
  ('KIMS Hospital',        'kims@hospital.in',        NULL, @demo_pw, 'hospital'),
  ('Care Hospital',        'care@hospital.in',        NULL, @demo_pw, 'hospital'),
  ('Continental Hospital', 'continental@hospital.in', NULL, @demo_pw, 'hospital'),
  ('Apollo Hospital',      'apollo@hospital.in',      NULL, @demo_pw, 'hospital'),
  ('Sunshine Hospital',    'sunshine@hospital.in',    NULL, @demo_pw, 'hospital'),
  ('Blood Bank Admin', 'admin@raktasetu.in', 'admin', @demo_pw, 'admin');

-- ----------------------------------------------------------------------------
-- Donors
-- ----------------------------------------------------------------------------
INSERT INTO donors (id, user_id, blood_group, city, phone, date_of_birth,
                    last_donation_date, total_donations, latitude, longitude) VALUES
  ('DNR-1042', (SELECT id FROM users WHERE email='ananya@example.com'), 'O+', 'Hyderabad',
   '+91 98480 11223', '1998-04-12', CURDATE() - INTERVAL 108 DAY, 6, 17.3850, 78.4867),
  ('DNR-0981', (SELECT id FROM users WHERE email='vikram@example.com'), 'O+', 'Hyderabad',
   '+91 98480 44556', '1995-09-03', CURDATE() - INTERVAL 151 DAY, 3, 17.4060, 78.4770),
  ('DNR-1103', (SELECT id FROM users WHERE email='farah@example.com'), 'O+', 'Hyderabad',
   '+91 98480 77889', '2000-01-25', CURDATE() - INTERVAL 31 DAY, 2, 17.3610, 78.4740),
  ('DNR-0877', (SELECT id FROM users WHERE email='rohit@example.com'), 'O+', 'Hyderabad',
   '+91 98480 99001', '1992-11-30', CURDATE() - INTERVAL 172 DAY, 5, 17.4400, 78.4980),
  ('DNR-0654', (SELECT id FROM users WHERE email='priya@example.com'), 'B+', 'Hyderabad',
   '+91 98480 22334', '1997-06-17', CURDATE() - INTERVAL 200 DAY, 4, 17.4420, 78.3560);

-- ----------------------------------------------------------------------------
-- Hospitals (real Hyderabad coordinates, so "nearby" distances are genuine)
-- ----------------------------------------------------------------------------
INSERT INTO hospitals (id, user_id, name, location, phone, latitude, longitude) VALUES
  ('HSP-1024', (SELECT id FROM users WHERE email='yashoda@hospital.in'),
   'Yashoda Hospital', 'Somajiguda', '+91 40 4567 4567', 17.4237, 78.4584),
  ('HSP-1025', (SELECT id FROM users WHERE email='kims@hospital.in'),
   'KIMS Hospital', 'Secunderabad', '+91 40 4488 4488', 17.4347, 78.4987),
  ('HSP-1026', (SELECT id FROM users WHERE email='care@hospital.in'),
   'Care Hospital', 'Banjara Hills', '+91 40 6165 6565', 17.4126, 78.4482),
  ('HSP-1027', (SELECT id FROM users WHERE email='continental@hospital.in'),
   'Continental Hospital', 'Gachibowli', '+91 40 6700 0000', 17.4633, 78.3443),
  ('HSP-1028', (SELECT id FROM users WHERE email='apollo@hospital.in'),
   'Apollo Hospital', 'Jubilee Hills', '+91 40 2360 7777', 17.4275, 78.4132),
  ('HSP-1029', (SELECT id FROM users WHERE email='sunshine@hospital.in'),
   'Sunshine Hospital', 'Paradise', '+91 40 4477 4477', 17.4419, 78.4922);

-- ----------------------------------------------------------------------------
-- Blood stock — 126 units across staggered batches (some near expiry,
-- so the expiry warnings and "near expiry" counts actually show up)
-- ----------------------------------------------------------------------------
INSERT INTO blood_batches (id, blood_group, units, collected_date, expiry_date, status, source_type) VALUES
  ('BAT-5001', 'A+', 39, CURDATE() - INTERVAL 22 DAY, CURDATE() + INTERVAL 20 DAY, 'available', 'donation'),
  ('BAT-5002', 'A+',  3, CURDATE() - INTERVAL 40 DAY, CURDATE() + INTERVAL  2 DAY, 'available', 'donation'),
  ('BAT-5003', 'A-', 11, CURDATE() - INTERVAL 32 DAY, CURDATE() + INTERVAL 10 DAY, 'available', 'camp'),
  ('BAT-5004', 'B+', 32, CURDATE() - INTERVAL 17 DAY, CURDATE() + INTERVAL 25 DAY, 'available', 'donation'),
  ('BAT-5005', 'B+',  5, CURDATE() - INTERVAL 41 DAY, CURDATE() + INTERVAL  1 DAY, 'available', 'camp'),
  ('BAT-5006', 'B-',  5, CURDATE() - INTERVAL 24 DAY, CURDATE() + INTERVAL 18 DAY, 'available', 'donation'),
  ('BAT-5007', 'B-',  1, CURDATE() - INTERVAL 40 DAY, CURDATE() + INTERVAL  2 DAY, 'available', 'donation'),
  ('BAT-5008', 'AB+',14, CURDATE() - INTERVAL 27 DAY, CURDATE() + INTERVAL 15 DAY, 'available', 'camp'),
  ('BAT-5009', 'AB-', 3, CURDATE() - INTERVAL 30 DAY, CURDATE() + INTERVAL 12 DAY, 'available', 'donation'),
  ('BAT-5010', 'O+',  7, CURDATE() - INTERVAL 20 DAY, CURDATE() + INTERVAL 22 DAY, 'available', 'donation'),
  ('BAT-5011', 'O+',  2, CURDATE() - INTERVAL 40 DAY, CURDATE() + INTERVAL  2 DAY, 'available', 'donation'),
  ('BAT-5012', 'O-',  3, CURDATE() - INTERVAL 33 DAY, CURDATE() + INTERVAL  9 DAY, 'available', 'donation'),
  ('BAT-5013', 'O-',  1, CURDATE() - INTERVAL 41 DAY, CURDATE() + INTERVAL  1 DAY, 'available', 'donation');

-- ----------------------------------------------------------------------------
-- Blood requests — the 4 live ones plus recent history for reports/forecast
-- ----------------------------------------------------------------------------
INSERT INTO blood_requests
  (id, hospital_id, blood_group, units_needed, units_fulfilled, urgency, status,
   patient_name, ward, notes, raised_at, fulfilled_at) VALUES
  ('REQ-7731', 'HSP-1024', 'O+',  3, 0, 'Critical', 'Matching',
   'Ramesh K.', 'ICU-4', 'Trauma case — road accident, requires immediate transfusion.',
   NOW() - INTERVAL 5 HOUR, NULL),
  ('REQ-7729', 'HSP-1026', 'AB-', 1, 0, 'Urgent', 'Pending',
   'Fatima S.', 'Surgical-2', 'Scheduled surgery — cardiac bypass.',
   NOW() - INTERVAL 8 HOUR, NULL),
  ('REQ-7728', 'HSP-1025', 'O+',  2, 0, 'Routine', 'Matched',
   'Arjun M.', 'General-6', 'Post-operative recovery, routine transfusion.',
   NOW() - INTERVAL 1 DAY, NULL),
  ('REQ-7720', 'HSP-1027', 'B+',  4, 4, 'Routine', 'Fulfilled',
   'Sita D.', 'Maternity', 'Childbirth complications resolved.',
   NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 2 DAY),
  -- recent fulfilled history (feeds the reports + forecast charts)
  ('REQ-7719', 'HSP-1024', 'A+',  2, 2, 'Routine', 'Fulfilled', 'Kiran P.', 'General-3', NULL,
   NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 4 DAY + INTERVAL 6 HOUR),
  ('REQ-7718', 'HSP-1025', 'B+',  3, 3, 'Urgent', 'Fulfilled', 'Divya R.', 'Emergency', NULL,
   NOW() - INTERVAL 6 DAY, NOW() - INTERVAL 6 DAY + INTERVAL 5 HOUR),
  ('REQ-7717', 'HSP-1028', 'O-',  2, 2, 'Critical', 'Fulfilled', 'Manoj T.', 'ICU-2', NULL,
   NOW() - INTERVAL 8 DAY, NOW() - INTERVAL 8 DAY + INTERVAL 3 HOUR),
  ('REQ-7716', 'HSP-1026', 'A-',  1, 1, 'Routine', 'Fulfilled', 'Lata M.', 'General-1', NULL,
   NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 10 DAY + INTERVAL 8 HOUR),
  ('REQ-7715', 'HSP-1029', 'AB+', 2, 2, 'Routine', 'Fulfilled', 'Suresh V.', 'Surgical-1', NULL,
   NOW() - INTERVAL 12 DAY, NOW() - INTERVAL 12 DAY + INTERVAL 7 HOUR),
  ('REQ-7714', 'HSP-1024', 'O+',  4, 4, 'Urgent', 'Fulfilled', 'Anita G.', 'Emergency', NULL,
   NOW() - INTERVAL 14 DAY, NOW() - INTERVAL 14 DAY + INTERVAL 4 HOUR);

-- ----------------------------------------------------------------------------
-- Donations — donor history (Ananya's 6 donations = "18 lives touched")
-- ----------------------------------------------------------------------------
INSERT INTO donations (donor_id, donation_date, location, units, status) VALUES
  ('DNR-1042', CURDATE() - INTERVAL 108 DAY, 'Apollo Blood Bank, Jubilee Hills', 1, 'Completed'),
  ('DNR-1042', CURDATE() - INTERVAL 240 DAY, 'City Camp, Gachibowli', 1, 'Completed'),
  ('DNR-1042', CURDATE() - INTERVAL 377 DAY, 'Apollo Blood Bank, Jubilee Hills', 1, 'Completed'),
  ('DNR-1042', CURDATE() - INTERVAL 513 DAY, 'Care Hospital, Banjara Hills', 1, 'Completed'),
  ('DNR-1042', CURDATE() - INTERVAL 640 DAY, 'Apollo Blood Bank, Jubilee Hills', 1, 'Completed'),
  ('DNR-1042', CURDATE() - INTERVAL 770 DAY, 'City Camp, Gachibowli', 1, 'Completed'),
  ('DNR-0981', CURDATE() - INTERVAL 151 DAY, 'KIMS Blood Bank, Secunderabad', 1, 'Completed'),
  ('DNR-0981', CURDATE() - INTERVAL 300 DAY, 'City Camp, Gachibowli', 1, 'Completed'),
  ('DNR-0981', CURDATE() - INTERVAL 450 DAY, 'KIMS Blood Bank, Secunderabad', 1, 'Completed'),
  ('DNR-1103', CURDATE() - INTERVAL 31 DAY, 'Apollo Blood Bank, Jubilee Hills', 1, 'Completed'),
  ('DNR-1103', CURDATE() - INTERVAL 200 DAY, 'City Camp, Gachibowli', 1, 'Completed'),
  ('DNR-0877', CURDATE() - INTERVAL 172 DAY, 'Yashoda Blood Bank, Somajiguda', 1, 'Completed'),
  ('DNR-0877', CURDATE() - INTERVAL 320 DAY, 'City Camp, Gachibowli', 1, 'Completed'),
  ('DNR-0877', CURDATE() - INTERVAL 500 DAY, 'Yashoda Blood Bank, Somajiguda', 1, 'Completed'),
  ('DNR-0877', CURDATE() - INTERVAL 680 DAY, 'City Camp, Gachibowli', 1, 'Completed'),
  ('DNR-0877', CURDATE() - INTERVAL 800 DAY, 'Yashoda Blood Bank, Somajiguda', 1, 'Completed'),
  ('DNR-0654', CURDATE() - INTERVAL 200 DAY, 'Continental Blood Bank, Gachibowli', 1, 'Completed'),
  ('DNR-0654', CURDATE() - INTERVAL 380 DAY, 'City Camp, Gachibowli', 1, 'Completed'),
  ('DNR-0654', CURDATE() - INTERVAL 560 DAY, 'Continental Blood Bank, Gachibowli', 1, 'Completed'),
  ('DNR-0654', CURDATE() - INTERVAL 720 DAY, 'City Camp, Gachibowli', 1, 'Completed');

-- ----------------------------------------------------------------------------
-- Camps
-- ----------------------------------------------------------------------------
INSERT INTO camps
  (id, name, location, organizer, camp_date, time_slot, status,
   expected_donors, units_collected, contact_phone) VALUES
  ('CAMP-301', 'Rotary Mega Blood Drive', 'Gachibowli Stadium, Hyderabad',
   'Rotary Club Hyderabad', CURDATE() + INTERVAL 20 DAY, '09:00 – 17:00', 'Upcoming',
   200, NULL, '+91 98765 43210'),
  ('CAMP-300', 'JNTU Awareness Camp', 'JNTU Campus, Kukatpally',
   'NSS Unit, JNTU', CURDATE() + INTERVAL 18 DAY, '10:00 – 15:00', 'Upcoming',
   120, NULL, '+91 91234 56789'),
  ('CAMP-299', 'Independence Day Drive', 'People''s Plaza, Necklace Road',
   'Red Cross Society', CURDATE() - INTERVAL 46 DAY, '08:00 – 16:00', 'Completed',
   300, 247, '+91 87654 32100'),
  ('CAMP-298', 'Corporate Wellness Camp', 'Infosys Campus, Pocharam',
   'Infosys CSR + City Blood Bank', CURDATE() - INTERVAL 59 DAY, '10:00 – 14:00', 'Completed',
   150, 112, '+91 80123 45678'),
  ('CAMP-297', 'World Blood Donor Day', 'Tank Bund, Hyderabad',
   'TS State Blood Transfusion Council', CURDATE() - INTERVAL 108 DAY, '07:00 – 18:00', 'Completed',
   500, 423, '+91 77889 90011');

-- ----------------------------------------------------------------------------
-- Cross-match records
-- ----------------------------------------------------------------------------
INSERT INTO crossmatch_records
  (id, donor_id, donor_name, donor_group, recipient_name, recipient_group,
   abo_compat, rh_compat, antibody_screen, result, tested_by, request_id, tested_at) VALUES
  ('CM-2041', 'DNR-1042', 'Ananya Rao', 'O+', 'Ramesh K.', 'O+',
   'Compatible', 'Compatible', 'Negative', 'Compatible', 'Dr. Srinivas R.', 'REQ-7731',
   NOW() - INTERVAL 4 HOUR),
  ('CM-2040', 'DNR-0981', 'Vikram Shetty', 'O+', 'Ramesh K.', 'O+',
   'Compatible', 'Compatible', 'Negative', 'Compatible', 'Dr. Srinivas R.', 'REQ-7731',
   NOW() - INTERVAL 4 HOUR),
  ('CM-2039', 'DNR-1103', 'Farah Khan', 'O+', 'Arjun M.', 'A+',
   'Compatible', 'Compatible', 'Negative', 'Compatible', 'Dr. Meera P.', 'REQ-7728',
   NOW() - INTERVAL 1 DAY),
  ('CM-2038', 'DNR-0877', 'Rohit Menon', 'O+', 'Sita D.', 'B+',
   'Compatible', 'Compatible', 'Positive — Anti-Kell', 'Incompatible', 'Dr. Meera P.', 'REQ-7720',
   NOW() - INTERVAL 3 DAY),
  ('CM-2037', 'DNR-0654', 'Priya Nair', 'B+', 'Sita D.', 'B+',
   'Compatible', 'Compatible', 'Negative', 'Compatible', 'Dr. Srinivas R.', 'REQ-7720',
   NOW() - INTERVAL 3 DAY);

-- ----------------------------------------------------------------------------
-- Alerts
-- ----------------------------------------------------------------------------
INSERT INTO alerts (id, type, detail, severity, raised_at) VALUES
  ('ALT-01', 'Critical stock',
   'O- has fallen to 4 units, below the 10-unit safety threshold.',
   'Critical', NOW() - INTERVAL 5 HOUR),
  ('ALT-02', 'Emergency request',
   'Yashoda Hospital needs 3 units of O+ (REQ-7731) — trauma case.',
   'Critical', NOW() - INTERVAL 5 HOUR),
  ('ALT-03', 'Near expiry',
   '5 units of B+ expire within 72 hours — prioritize for dispatch.',
   'Warning', NOW() - INTERVAL 6 HOUR);

-- ----------------------------------------------------------------------------
-- Sanity checks (run these after the script to confirm):
--   SELECT COUNT(*) FROM users;            -- 12
--   SELECT COUNT(*) FROM donors;            -- 5
--   SELECT COUNT(*) FROM hospitals;         -- 6
--   SELECT * FROM v_inventory;              -- 8 rows, 126 units total
--   SELECT COUNT(*) FROM blood_requests;    -- 10
--   SELECT COUNT(*) FROM donations;         -- 20
--   SELECT COUNT(*) FROM camps;             -- 5
--   SELECT COUNT(*) FROM crossmatch_records;-- 5
--   SELECT COUNT(*) FROM alerts;            -- 3
-- ----------------------------------------------------------------------------
