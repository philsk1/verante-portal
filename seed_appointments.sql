-- Appointment history seed for all real test tenants
-- Generates 90 days of realistic data. Safe to re-run (uses DELETE + INSERT pattern).
-- Run in Supabase SQL editor.

DELETE FROM appointments WHERE tenant_id IN (
  'f8a972b0-6359-4e85-a02f-388e79cf5ff8', -- Thornton Physiotherapy
  '0ceb9848-6811-4eb1-b843-2c97c21a1a88', -- Haverford Dental
  '7a9f6e6a-7503-4774-afd2-a1707a9a7740', -- Clarity Yoga
  '4bd5f989-6809-4e08-9219-687242be9f76', -- Jennings Nail & Beauty
  '2c67eb22-833a-4496-b0a7-92fbb5cbae02', -- Williams & Associates
  'c174e760-e641-45b6-af36-3808f0731ab4', -- Whitmore Electrical
  'f429cddd-433c-461f-b793-ee94a9f2d343', -- Capital Mortgage
  'c9939e2e-8eca-42ff-879d-74aff3abb62e', -- Webb Financial
  'a0d47125-3406-43f6-805a-38cd46253bf1', -- Apex Commercial Cleaning
  'a60e0bdc-00df-465c-a83c-b9eccfe0aff0'  -- Sarah's Bridal
);

-- ─── Thornton Physiotherapy & Sports Rehab ────────────────────────────────────
-- Services: Initial Assessment (c79e3867, 60m, £75), Follow-up (09e46298, 45m, £55),
--           Sports Massage (959830be, 60m, £55), Sports Injury (6be7adf0, 45m, £65)
INSERT INTO appointments (tenant_id, title, appointment_type, service_id, start_time, end_time, status, created_from) VALUES
-- Week -13
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Tom Harrison — Initial Assessment','Initial Assessment','c79e3867-defa-4ff8-946f-fc632648426a', NOW()-INTERVAL'91 days'+TIME'09:00',NOW()-INTERVAL'91 days'+TIME'10:00','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Sarah Mitchell — Sports Massage','Sports Massage (60 min)','959830be-0e8a-4c25-8e2b-5dfe5c684454', NOW()-INTERVAL'91 days'+TIME'11:00',NOW()-INTERVAL'91 days'+TIME'12:00','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','James Cooper — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()-INTERVAL'89 days'+TIME'14:00',NOW()-INTERVAL'89 days'+TIME'14:45','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Emma Davies — Sports Injury','Sports Injury Consultation','6be7adf0-a3f5-4573-9528-7643c1e97662', NOW()-INTERVAL'88 days'+TIME'10:00',NOW()-INTERVAL'88 days'+TIME'10:45','completed','manual'),
-- Week -12
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Tom Harrison — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()-INTERVAL'84 days'+TIME'09:00',NOW()-INTERVAL'84 days'+TIME'09:45','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Michael Walsh — Initial Assessment','Initial Assessment','c79e3867-defa-4ff8-946f-fc632648426a', NOW()-INTERVAL'84 days'+TIME'11:00',NOW()-INTERVAL'84 days'+TIME'12:00','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Claire Robertson — Sports Massage','Sports Massage (60 min)','959830be-0e8a-4c25-8e2b-5dfe5c684454', NOW()-INTERVAL'83 days'+TIME'14:00',NOW()-INTERVAL'83 days'+TIME'15:00','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Emma Davies — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()-INTERVAL'82 days'+TIME'09:30',NOW()-INTERVAL'82 days'+TIME'10:15','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','David Turner — Sports Injury','Sports Injury Consultation','6be7adf0-a3f5-4573-9528-7643c1e97662', NOW()-INTERVAL'81 days'+TIME'15:00',NOW()-INTERVAL'81 days'+TIME'15:45','completed','manual'),
-- Week -11
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Anna Pearce — Initial Assessment','Initial Assessment','c79e3867-defa-4ff8-946f-fc632648426a', NOW()-INTERVAL'77 days'+TIME'09:00',NOW()-INTERVAL'77 days'+TIME'10:00','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Michael Walsh — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()-INTERVAL'77 days'+TIME'11:00',NOW()-INTERVAL'77 days'+TIME'11:45','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Tom Harrison — Sports Massage','Sports Massage (60 min)','959830be-0e8a-4c25-8e2b-5dfe5c684454', NOW()-INTERVAL'76 days'+TIME'14:00',NOW()-INTERVAL'76 days'+TIME'15:00','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Sarah Mitchell — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()-INTERVAL'75 days'+TIME'10:00',NOW()-INTERVAL'75 days'+TIME'10:45','no_show','manual'),
-- Week -10
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Robert Fenn — Initial Assessment','Initial Assessment','c79e3867-defa-4ff8-946f-fc632648426a', NOW()-INTERVAL'70 days'+TIME'09:30',NOW()-INTERVAL'70 days'+TIME'10:30','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Anna Pearce — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()-INTERVAL'70 days'+TIME'14:00',NOW()-INTERVAL'70 days'+TIME'14:45','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','David Turner — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()-INTERVAL'68 days'+TIME'11:00',NOW()-INTERVAL'68 days'+TIME'11:45','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Claire Robertson — Initial Assessment','Initial Assessment','c79e3867-defa-4ff8-946f-fc632648426a', NOW()-INTERVAL'67 days'+TIME'15:00',NOW()-INTERVAL'67 days'+TIME'16:00','completed','manual'),
-- Week -9
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Linda Marsh — Sports Massage','Sports Massage (60 min)','959830be-0e8a-4c25-8e2b-5dfe5c684454', NOW()-INTERVAL'63 days'+TIME'09:00',NOW()-INTERVAL'63 days'+TIME'10:00','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Robert Fenn — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()-INTERVAL'63 days'+TIME'11:00',NOW()-INTERVAL'63 days'+TIME'11:45','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','James Cooper — Sports Injury','Sports Injury Consultation','6be7adf0-a3f5-4573-9528-7643c1e97662', NOW()-INTERVAL'61 days'+TIME'14:30',NOW()-INTERVAL'61 days'+TIME'15:15','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Michael Walsh — Sports Massage','Sports Massage (60 min)','959830be-0e8a-4c25-8e2b-5dfe5c684454', NOW()-INTERVAL'60 days'+TIME'10:00',NOW()-INTERVAL'60 days'+TIME'11:00','completed','manual'),
-- Week -8
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Tom Harrison — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()-INTERVAL'56 days'+TIME'09:00',NOW()-INTERVAL'56 days'+TIME'09:45','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Priya Sharma — Initial Assessment','Initial Assessment','c79e3867-defa-4ff8-946f-fc632648426a', NOW()-INTERVAL'56 days'+TIME'11:00',NOW()-INTERVAL'56 days'+TIME'12:00','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Linda Marsh — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()-INTERVAL'54 days'+TIME'14:00',NOW()-INTERVAL'54 days'+TIME'14:45','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Anna Pearce — Sports Massage','Sports Massage (60 min)','959830be-0e8a-4c25-8e2b-5dfe5c684454', NOW()-INTERVAL'53 days'+TIME'15:00',NOW()-INTERVAL'53 days'+TIME'16:00','cancelled','manual'),
-- Week -7
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Priya Sharma — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()-INTERVAL'49 days'+TIME'09:30',NOW()-INTERVAL'49 days'+TIME'10:15','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Claire Robertson — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()-INTERVAL'49 days'+TIME'14:00',NOW()-INTERVAL'49 days'+TIME'14:45','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Ben Clarke — Initial Assessment','Initial Assessment','c79e3867-defa-4ff8-946f-fc632648426a', NOW()-INTERVAL'47 days'+TIME'11:00',NOW()-INTERVAL'47 days'+TIME'12:00','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','David Turner — Sports Massage','Sports Massage (60 min)','959830be-0e8a-4c25-8e2b-5dfe5c684454', NOW()-INTERVAL'46 days'+TIME'15:30',NOW()-INTERVAL'46 days'+TIME'16:30','completed','manual'),
-- Week -6
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Tom Harrison — Sports Massage','Sports Massage (60 min)','959830be-0e8a-4c25-8e2b-5dfe5c684454', NOW()-INTERVAL'42 days'+TIME'09:00',NOW()-INTERVAL'42 days'+TIME'10:00','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Ben Clarke — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()-INTERVAL'42 days'+TIME'11:00',NOW()-INTERVAL'42 days'+TIME'11:45','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Priya Sharma — Sports Injury','Sports Injury Consultation','6be7adf0-a3f5-4573-9528-7643c1e97662', NOW()-INTERVAL'40 days'+TIME'14:00',NOW()-INTERVAL'40 days'+TIME'14:45','completed','manual'),
-- Week -5
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Sarah Mitchell — Initial Assessment','Initial Assessment','c79e3867-defa-4ff8-946f-fc632648426a', NOW()-INTERVAL'35 days'+TIME'10:00',NOW()-INTERVAL'35 days'+TIME'11:00','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Robert Fenn — Sports Massage','Sports Massage (60 min)','959830be-0e8a-4c25-8e2b-5dfe5c684454', NOW()-INTERVAL'34 days'+TIME'14:00',NOW()-INTERVAL'34 days'+TIME'15:00','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Ben Clarke — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()-INTERVAL'33 days'+TIME'09:00',NOW()-INTERVAL'33 days'+TIME'09:45','completed','manual'),
-- Week -4
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Linda Marsh — Initial Assessment','Initial Assessment','c79e3867-defa-4ff8-946f-fc632648426a', NOW()-INTERVAL'28 days'+TIME'09:00',NOW()-INTERVAL'28 days'+TIME'10:00','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Emma Davies — Sports Massage','Sports Massage (60 min)','959830be-0e8a-4c25-8e2b-5dfe5c684454', NOW()-INTERVAL'27 days'+TIME'11:00',NOW()-INTERVAL'27 days'+TIME'12:00','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Michael Walsh — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()-INTERVAL'26 days'+TIME'14:30',NOW()-INTERVAL'26 days'+TIME'15:15','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','James Cooper — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()-INTERVAL'25 days'+TIME'09:30',NOW()-INTERVAL'25 days'+TIME'10:15','no_show','manual'),
-- Week -3
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Priya Sharma — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()-INTERVAL'21 days'+TIME'09:00',NOW()-INTERVAL'21 days'+TIME'09:45','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Anna Pearce — Initial Assessment','Initial Assessment','c79e3867-defa-4ff8-946f-fc632648426a', NOW()-INTERVAL'21 days'+TIME'11:00',NOW()-INTERVAL'21 days'+TIME'12:00','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Robert Fenn — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()-INTERVAL'19 days'+TIME'14:00',NOW()-INTERVAL'19 days'+TIME'14:45','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Tom Harrison — Sports Injury','Sports Injury Consultation','6be7adf0-a3f5-4573-9528-7643c1e97662', NOW()-INTERVAL'18 days'+TIME'15:00',NOW()-INTERVAL'18 days'+TIME'15:45','completed','manual'),
-- Week -2
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Sarah Mitchell — Sports Massage','Sports Massage (60 min)','959830be-0e8a-4c25-8e2b-5dfe5c684454', NOW()-INTERVAL'14 days'+TIME'10:00',NOW()-INTERVAL'14 days'+TIME'11:00','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Linda Marsh — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()-INTERVAL'13 days'+TIME'14:00',NOW()-INTERVAL'13 days'+TIME'14:45','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Claire Robertson — Sports Massage','Sports Massage (60 min)','959830be-0e8a-4c25-8e2b-5dfe5c684454', NOW()-INTERVAL'12 days'+TIME'09:00',NOW()-INTERVAL'12 days'+TIME'10:00','completed','manual'),
-- Week -1
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Ben Clarke — Sports Massage','Sports Massage (60 min)','959830be-0e8a-4c25-8e2b-5dfe5c684454', NOW()-INTERVAL'7 days'+TIME'09:00',NOW()-INTERVAL'7 days'+TIME'10:00','completed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Emma Davies — Initial Assessment','Initial Assessment','c79e3867-defa-4ff8-946f-fc632648426a', NOW()-INTERVAL'7 days'+TIME'11:30',NOW()-INTERVAL'7 days'+TIME'12:30','confirmed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','David Turner — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()-INTERVAL'5 days'+TIME'14:00',NOW()-INTERVAL'5 days'+TIME'14:45','confirmed','manual'),
-- This week / upcoming
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Priya Sharma — Sports Massage','Sports Massage (60 min)','959830be-0e8a-4c25-8e2b-5dfe5c684454', NOW()+INTERVAL'1 day'+TIME'09:00',NOW()+INTERVAL'1 day'+TIME'10:00','confirmed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Tom Harrison — Follow-up Treatment','Follow-up Treatment Session','09e46298-6bb1-452e-a76f-85c10807cebf', NOW()+INTERVAL'2 days'+TIME'11:00',NOW()+INTERVAL'2 days'+TIME'11:45','confirmed','manual'),
('f8a972b0-6359-4e85-a02f-388e79cf5ff8','Michael Walsh — Initial Assessment','Initial Assessment','c79e3867-defa-4ff8-946f-fc632648426a', NOW()+INTERVAL'3 days'+TIME'14:00',NOW()+INTERVAL'3 days'+TIME'15:00','provisional','manual');

-- ─── Haverford Dental Practice ────────────────────────────────────────────────
INSERT INTO appointments (tenant_id, title, appointment_type, service_id, start_time, end_time, status, created_from) VALUES
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Patricia Holt — Routine Check-up','Routine Check-up & Scale','7844e7a1-8a62-40b0-812a-f66cd5f24d1c', NOW()-INTERVAL'89 days'+TIME'09:00',NOW()-INTERVAL'89 days'+TIME'09:30','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Daniel Wright — New Patient','New Patient Examination','4fcd4f9f-fb6b-45ba-8c53-1d0e5c2ff267', NOW()-INTERVAL'89 days'+TIME'10:00',NOW()-INTERVAL'89 days'+TIME'10:45','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Jane Mills — Tooth Whitening','Tooth Whitening','a5dd6497-37a8-4f54-82bf-f3065294458d', NOW()-INTERVAL'88 days'+TIME'11:00',NOW()-INTERVAL'88 days'+TIME'12:00','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Gary Thompson — Routine Check-up','Routine Check-up & Scale','7844e7a1-8a62-40b0-812a-f66cd5f24d1c', NOW()-INTERVAL'87 days'+TIME'14:00',NOW()-INTERVAL'87 days'+TIME'14:30','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Susan Barker — Emergency','Emergency Appointment','7492748b-48b6-4b4a-a061-038ae3c09a73', NOW()-INTERVAL'85 days'+TIME'08:30',NOW()-INTERVAL'85 days'+TIME'09:00','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Mark Davies — Routine Check-up','Routine Check-up & Scale','7844e7a1-8a62-40b0-812a-f66cd5f24d1c', NOW()-INTERVAL'83 days'+TIME'09:30',NOW()-INTERVAL'83 days'+TIME'10:00','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Patricia Holt — Composite Bonding','Composite Bonding','be198203-0f1a-4cee-be7c-e1a72b4a6026', NOW()-INTERVAL'82 days'+TIME'11:00',NOW()-INTERVAL'82 days'+TIME'12:30','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Laura Stone — New Patient','New Patient Examination','4fcd4f9f-fb6b-45ba-8c53-1d0e5c2ff267', NOW()-INTERVAL'80 days'+TIME'14:30',NOW()-INTERVAL'80 days'+TIME'15:15','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Gary Thompson — Routine Check-up','Routine Check-up & Scale','7844e7a1-8a62-40b0-812a-f66cd5f24d1c', NOW()-INTERVAL'77 days'+TIME'09:00',NOW()-INTERVAL'77 days'+TIME'09:30','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Daniel Wright — Routine Check-up','Routine Check-up & Scale','7844e7a1-8a62-40b0-812a-f66cd5f24d1c', NOW()-INTERVAL'76 days'+TIME'10:30',NOW()-INTERVAL'76 days'+TIME'11:00','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Jane Mills — Routine Check-up','Routine Check-up & Scale','7844e7a1-8a62-40b0-812a-f66cd5f24d1c', NOW()-INTERVAL'74 days'+TIME'14:00',NOW()-INTERVAL'74 days'+TIME'14:30','no_show','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Chris Owen — Emergency','Emergency Appointment','7492748b-48b6-4b4a-a061-038ae3c09a73', NOW()-INTERVAL'72 days'+TIME'08:30',NOW()-INTERVAL'72 days'+TIME'09:00','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Laura Stone — Routine Check-up','Routine Check-up & Scale','7844e7a1-8a62-40b0-812a-f66cd5f24d1c', NOW()-INTERVAL'70 days'+TIME'09:30',NOW()-INTERVAL'70 days'+TIME'10:00','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Susan Barker — Tooth Whitening','Tooth Whitening','a5dd6497-37a8-4f54-82bf-f3065294458d', NOW()-INTERVAL'69 days'+TIME'11:00',NOW()-INTERVAL'69 days'+TIME'12:00','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Mark Davies — New Patient','New Patient Examination','4fcd4f9f-fb6b-45ba-8c53-1d0e5c2ff267', NOW()-INTERVAL'67 days'+TIME'14:00',NOW()-INTERVAL'67 days'+TIME'14:45','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Patricia Holt — Routine Check-up','Routine Check-up & Scale','7844e7a1-8a62-40b0-812a-f66cd5f24d1c', NOW()-INTERVAL'63 days'+TIME'09:00',NOW()-INTERVAL'63 days'+TIME'09:30','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Chris Owen — Composite Bonding','Composite Bonding','be198203-0f1a-4cee-be7c-e1a72b4a6026', NOW()-INTERVAL'62 days'+TIME'10:00',NOW()-INTERVAL'62 days'+TIME'11:30','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Karen Fox — Routine Check-up','Routine Check-up & Scale','7844e7a1-8a62-40b0-812a-f66cd5f24d1c', NOW()-INTERVAL'60 days'+TIME'14:30',NOW()-INTERVAL'60 days'+TIME'15:00','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Daniel Wright — Tooth Whitening','Tooth Whitening','a5dd6497-37a8-4f54-82bf-f3065294458d', NOW()-INTERVAL'56 days'+TIME'11:00',NOW()-INTERVAL'56 days'+TIME'12:00','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Gary Thompson — Emergency','Emergency Appointment','7492748b-48b6-4b4a-a061-038ae3c09a73', NOW()-INTERVAL'53 days'+TIME'08:30',NOW()-INTERVAL'53 days'+TIME'09:00','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Laura Stone — Composite Bonding','Composite Bonding','be198203-0f1a-4cee-be7c-e1a72b4a6026', NOW()-INTERVAL'49 days'+TIME'10:00',NOW()-INTERVAL'49 days'+TIME'11:30','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Karen Fox — New Patient','New Patient Examination','4fcd4f9f-fb6b-45ba-8c53-1d0e5c2ff267', NOW()-INTERVAL'47 days'+TIME'14:00',NOW()-INTERVAL'47 days'+TIME'14:45','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Jane Mills — Routine Check-up','Routine Check-up & Scale','7844e7a1-8a62-40b0-812a-f66cd5f24d1c', NOW()-INTERVAL'42 days'+TIME'09:30',NOW()-INTERVAL'42 days'+TIME'10:00','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Mark Davies — Routine Check-up','Routine Check-up & Scale','7844e7a1-8a62-40b0-812a-f66cd5f24d1c', NOW()-INTERVAL'40 days'+TIME'11:00',NOW()-INTERVAL'40 days'+TIME'11:30','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Susan Barker — Routine Check-up','Routine Check-up & Scale','7844e7a1-8a62-40b0-812a-f66cd5f24d1c', NOW()-INTERVAL'35 days'+TIME'14:00',NOW()-INTERVAL'35 days'+TIME'14:30','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Patricia Holt — Emergency','Emergency Appointment','7492748b-48b6-4b4a-a061-038ae3c09a73', NOW()-INTERVAL'28 days'+TIME'08:30',NOW()-INTERVAL'28 days'+TIME'09:00','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Karen Fox — Tooth Whitening','Tooth Whitening','a5dd6497-37a8-4f54-82bf-f3065294458d', NOW()-INTERVAL'21 days'+TIME'11:00',NOW()-INTERVAL'21 days'+TIME'12:00','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Chris Owen — Routine Check-up','Routine Check-up & Scale','7844e7a1-8a62-40b0-812a-f66cd5f24d1c', NOW()-INTERVAL'14 days'+TIME'09:00',NOW()-INTERVAL'14 days'+TIME'09:30','completed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Gary Thompson — Composite Bonding','Composite Bonding','be198203-0f1a-4cee-be7c-e1a72b4a6026', NOW()-INTERVAL'7 days'+TIME'10:00',NOW()-INTERVAL'7 days'+TIME'11:30','confirmed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Laura Stone — Routine Check-up','Routine Check-up & Scale','7844e7a1-8a62-40b0-812a-f66cd5f24d1c', NOW()+INTERVAL'1 day'+TIME'09:30',NOW()+INTERVAL'1 day'+TIME'10:00','confirmed','manual'),
('0ceb9848-6811-4eb1-b843-2c97c21a1a88','Daniel Wright — Emergency','Emergency Appointment','7492748b-48b6-4b4a-a061-038ae3c09a73', NOW()+INTERVAL'2 days'+TIME'08:30',NOW()+INTERVAL'2 days'+TIME'09:00','provisional','manual');

-- ─── Jennings Nail & Beauty Studio ───────────────────────────────────────────
INSERT INTO appointments (tenant_id, title, appointment_type, service_id, start_time, end_time, status, created_from) VALUES
('4bd5f989-6809-4e08-9219-687242be9f76','Chloe Adams — Gel Manicure','Gel Manicure','9ae8b8b5-4a9e-4470-88e7-f15f4b19dca2', NOW()-INTERVAL'88 days'+TIME'10:00',NOW()-INTERVAL'88 days'+TIME'11:00','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Rebecca Owen — Lash Extensions','Lash Extensions','c3448f64-a338-4d38-91ff-a9aa4b771e9e', NOW()-INTERVAL'87 days'+TIME'12:00',NOW()-INTERVAL'87 days'+TIME'13:30','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Tanya Ross — Gel Manicure','Gel Manicure','9ae8b8b5-4a9e-4470-88e7-f15f4b19dca2', NOW()-INTERVAL'85 days'+TIME'14:00',NOW()-INTERVAL'85 days'+TIME'15:00','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Amber Lee — Acrylic Full Set','Acrylic Full Set','a8b91323-adcb-4677-9ab6-37828e09b8f5', NOW()-INTERVAL'84 days'+TIME'10:00',NOW()-INTERVAL'84 days'+TIME'11:30','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Chloe Adams — Brow Shaping','Brow Shaping','35d20e02-cf01-4cb6-b9a0-8de3bc647efd', NOW()-INTERVAL'81 days'+TIME'09:00',NOW()-INTERVAL'81 days'+TIME'09:30','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Kelly Nash — Gel Manicure','Gel Manicure','9ae8b8b5-4a9e-4470-88e7-f15f4b19dca2', NOW()-INTERVAL'80 days'+TIME'11:00',NOW()-INTERVAL'80 days'+TIME'12:00','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Rebecca Owen — Gel Manicure','Gel Manicure','9ae8b8b5-4a9e-4470-88e7-f15f4b19dca2', NOW()-INTERVAL'77 days'+TIME'14:00',NOW()-INTERVAL'77 days'+TIME'15:00','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Tanya Ross — Lash Extensions','Lash Extensions','c3448f64-a338-4d38-91ff-a9aa4b771e9e', NOW()-INTERVAL'74 days'+TIME'10:00',NOW()-INTERVAL'74 days'+TIME'11:30','no_show','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Amber Lee — Gel Manicure','Gel Manicure','9ae8b8b5-4a9e-4470-88e7-f15f4b19dca2', NOW()-INTERVAL'70 days'+TIME'09:00',NOW()-INTERVAL'70 days'+TIME'10:00','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Nikki West — Lash Extensions','Lash Extensions','c3448f64-a338-4d38-91ff-a9aa4b771e9e', NOW()-INTERVAL'69 days'+TIME'13:00',NOW()-INTERVAL'69 days'+TIME'14:30','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Kelly Nash — Acrylic Full Set','Acrylic Full Set','a8b91323-adcb-4677-9ab6-37828e09b8f5', NOW()-INTERVAL'67 days'+TIME'10:30',NOW()-INTERVAL'67 days'+TIME'12:00','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Chloe Adams — Gel Manicure','Gel Manicure','9ae8b8b5-4a9e-4470-88e7-f15f4b19dca2', NOW()-INTERVAL'63 days'+TIME'11:00',NOW()-INTERVAL'63 days'+TIME'12:00','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Rebecca Owen — Brow Shaping','Brow Shaping','35d20e02-cf01-4cb6-b9a0-8de3bc647efd', NOW()-INTERVAL'60 days'+TIME'14:30',NOW()-INTERVAL'60 days'+TIME'15:00','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Tanya Ross — Gel Manicure','Gel Manicure','9ae8b8b5-4a9e-4470-88e7-f15f4b19dca2', NOW()-INTERVAL'56 days'+TIME'09:30',NOW()-INTERVAL'56 days'+TIME'10:30','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Nikki West — Gel Manicure','Gel Manicure','9ae8b8b5-4a9e-4470-88e7-f15f4b19dca2', NOW()-INTERVAL'53 days'+TIME'11:00',NOW()-INTERVAL'53 days'+TIME'12:00','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Amber Lee — Lash Extensions','Lash Extensions','c3448f64-a338-4d38-91ff-a9aa4b771e9e', NOW()-INTERVAL'49 days'+TIME'14:00',NOW()-INTERVAL'49 days'+TIME'15:30','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Kelly Nash — Brow Shaping','Brow Shaping','35d20e02-cf01-4cb6-b9a0-8de3bc647efd', NOW()-INTERVAL'46 days'+TIME'10:00',NOW()-INTERVAL'46 days'+TIME'10:30','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Chloe Adams — Acrylic Full Set','Acrylic Full Set','a8b91323-adcb-4677-9ab6-37828e09b8f5', NOW()-INTERVAL'42 days'+TIME'09:00',NOW()-INTERVAL'42 days'+TIME'10:30','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Rebecca Owen — Lash Extensions','Lash Extensions','c3448f64-a338-4d38-91ff-a9aa4b771e9e', NOW()-INTERVAL'38 days'+TIME'13:00',NOW()-INTERVAL'38 days'+TIME'14:30','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Tanya Ross — Acrylic Full Set','Acrylic Full Set','a8b91323-adcb-4677-9ab6-37828e09b8f5', NOW()-INTERVAL'35 days'+TIME'10:00',NOW()-INTERVAL'35 days'+TIME'11:30','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Nikki West — Brow Shaping','Brow Shaping','35d20e02-cf01-4cb6-b9a0-8de3bc647efd', NOW()-INTERVAL'28 days'+TIME'14:00',NOW()-INTERVAL'28 days'+TIME'14:30','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Amber Lee — Gel Manicure','Gel Manicure','9ae8b8b5-4a9e-4470-88e7-f15f4b19dca2', NOW()-INTERVAL'21 days'+TIME'11:00',NOW()-INTERVAL'21 days'+TIME'12:00','completed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Kelly Nash — Lash Extensions','Lash Extensions','c3448f64-a338-4d38-91ff-a9aa4b771e9e', NOW()-INTERVAL'14 days'+TIME'13:00',NOW()-INTERVAL'14 days'+TIME'14:30','confirmed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Chloe Adams — Gel Manicure','Gel Manicure','9ae8b8b5-4a9e-4470-88e7-f15f4b19dca2', NOW()-INTERVAL'7 days'+TIME'10:00',NOW()-INTERVAL'7 days'+TIME'11:00','confirmed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Rebecca Owen — Acrylic Full Set','Acrylic Full Set','a8b91323-adcb-4677-9ab6-37828e09b8f5', NOW()+INTERVAL'1 day'+TIME'10:00',NOW()+INTERVAL'1 day'+TIME'11:30','confirmed','manual'),
('4bd5f989-6809-4e08-9219-687242be9f76','Tanya Ross — Gel Manicure','Gel Manicure','9ae8b8b5-4a9e-4470-88e7-f15f4b19dca2', NOW()+INTERVAL'2 days'+TIME'13:00',NOW()+INTERVAL'2 days'+TIME'14:00','provisional','manual');

-- ─── Williams & Associates LLP ────────────────────────────────────────────────
INSERT INTO appointments (tenant_id, title, appointment_type, service_id, start_time, end_time, status, created_from) VALUES
('2c67eb22-833a-4496-b0a7-92fbb5cbae02','Adrian Foster — Initial Consultation','Initial Consultation','54a74138-ef06-48a8-b7c5-1199ddb49a74', NOW()-INTERVAL'85 days'+TIME'10:00',NOW()-INTERVAL'85 days'+TIME'11:00','completed','manual'),
('2c67eb22-833a-4496-b0a7-92fbb5cbae02','Sandra Miles — Employment Law','Employment Law Advice','e323e464-7eff-4a0e-81fa-d644638cfdd9', NOW()-INTERVAL'83 days'+TIME'14:00',NOW()-INTERVAL'83 days'+TIME'15:00','completed','manual'),
('2c67eb22-833a-4496-b0a7-92fbb5cbae02','Frank Holt — Wills & Probate','Wills & Probate','4f6401ed-8a58-4844-8e1a-9019415985c9', NOW()-INTERVAL'79 days'+TIME'11:00',NOW()-INTERVAL'79 days'+TIME'12:00','completed','manual'),
('2c67eb22-833a-4496-b0a7-92fbb5cbae02','Maria Santos — Initial Consultation','Initial Consultation','54a74138-ef06-48a8-b7c5-1199ddb49a74', NOW()-INTERVAL'76 days'+TIME'09:00',NOW()-INTERVAL'76 days'+TIME'10:00','completed','manual'),
('2c67eb22-833a-4496-b0a7-92fbb5cbae02','Adrian Foster — Employment Law','Employment Law Advice','e323e464-7eff-4a0e-81fa-d644638cfdd9', NOW()-INTERVAL'72 days'+TIME'14:00',NOW()-INTERVAL'72 days'+TIME'15:00','completed','manual'),
('2c67eb22-833a-4496-b0a7-92fbb5cbae02','George Neal — Wills & Probate','Wills & Probate','4f6401ed-8a58-4844-8e1a-9019415985c9', NOW()-INTERVAL'68 days'+TIME'10:00',NOW()-INTERVAL'68 days'+TIME'11:00','completed','manual'),
('2c67eb22-833a-4496-b0a7-92fbb5cbae02','Sandra Miles — Initial Consultation','Initial Consultation','54a74138-ef06-48a8-b7c5-1199ddb49a74', NOW()-INTERVAL'63 days'+TIME'09:30',NOW()-INTERVAL'63 days'+TIME'10:30','completed','manual'),
('2c67eb22-833a-4496-b0a7-92fbb5cbae02','Frank Holt — Employment Law','Employment Law Advice','e323e464-7eff-4a0e-81fa-d644638cfdd9', NOW()-INTERVAL'58 days'+TIME'14:00',NOW()-INTERVAL'58 days'+TIME'15:00','no_show','manual'),
('2c67eb22-833a-4496-b0a7-92fbb5cbae02','Maria Santos — Wills & Probate','Wills & Probate','4f6401ed-8a58-4844-8e1a-9019415985c9', NOW()-INTERVAL'52 days'+TIME'11:00',NOW()-INTERVAL'52 days'+TIME'12:00','completed','manual'),
('2c67eb22-833a-4496-b0a7-92fbb5cbae02','George Neal — Initial Consultation','Initial Consultation','54a74138-ef06-48a8-b7c5-1199ddb49a74', NOW()-INTERVAL'45 days'+TIME'09:00',NOW()-INTERVAL'45 days'+TIME'10:00','completed','manual'),
('2c67eb22-833a-4496-b0a7-92fbb5cbae02','Adrian Foster — Wills & Probate','Wills & Probate','4f6401ed-8a58-4844-8e1a-9019415985c9', NOW()-INTERVAL'38 days'+TIME'14:00',NOW()-INTERVAL'38 days'+TIME'15:00','completed','manual'),
('2c67eb22-833a-4496-b0a7-92fbb5cbae02','Sandra Miles — Employment Law','Employment Law Advice','e323e464-7eff-4a0e-81fa-d644638cfdd9', NOW()-INTERVAL'28 days'+TIME'10:00',NOW()-INTERVAL'28 days'+TIME'11:00','completed','manual'),
('2c67eb22-833a-4496-b0a7-92fbb5cbae02','Frank Holt — Initial Consultation','Initial Consultation','54a74138-ef06-48a8-b7c5-1199ddb49a74', NOW()-INTERVAL'18 days'+TIME'14:30',NOW()-INTERVAL'18 days'+TIME'15:30','completed','manual'),
('2c67eb22-833a-4496-b0a7-92fbb5cbae02','Maria Santos — Employment Law','Employment Law Advice','e323e464-7eff-4a0e-81fa-d644638cfdd9', NOW()-INTERVAL'10 days'+TIME'11:00',NOW()-INTERVAL'10 days'+TIME'12:00','confirmed','manual'),
('2c67eb22-833a-4496-b0a7-92fbb5cbae02','George Neal — Wills & Probate','Wills & Probate','4f6401ed-8a58-4844-8e1a-9019415985c9', NOW()+INTERVAL'2 days'+TIME'14:00',NOW()+INTERVAL'2 days'+TIME'15:00','confirmed','manual'),
('2c67eb22-833a-4496-b0a7-92fbb5cbae02','Adrian Foster — Initial Consultation','Initial Consultation','54a74138-ef06-48a8-b7c5-1199ddb49a74', NOW()+INTERVAL'4 days'+TIME'10:00',NOW()+INTERVAL'4 days'+TIME'11:00','provisional','manual');

-- ─── Whitmore Electrical Services ────────────────────────────────────────────
INSERT INTO appointments (tenant_id, title, appointment_type, service_id, start_time, end_time, status, created_from) VALUES
('c174e760-e641-45b6-af36-3808f0731ab4','Richards Property — Fault Finding','Fault Finding & Repair','4fa3a502-21cf-4f7f-8902-2b75588d4c2b', NOW()-INTERVAL'88 days'+TIME'08:00',NOW()-INTERVAL'88 days'+TIME'09:00','completed','manual'),
('c174e760-e641-45b6-af36-3808f0731ab4','Sunrise Offices — Periodic Inspection','Periodic Electrical Inspection','78ec73bf-2923-4d5e-abb0-3d25697de58f', NOW()-INTERVAL'86 days'+TIME'09:00',NOW()-INTERVAL'86 days'+TIME'11:00','completed','manual'),
('c174e760-e641-45b6-af36-3808f0731ab4','J. Patel — EV Charger Installation','EV Charger Installation','da3636c6-1843-4c35-b8a8-d5d9dde97f10', NOW()-INTERVAL'83 days'+TIME'08:00',NOW()-INTERVAL'83 days'+TIME'11:00','completed','manual'),
('c174e760-e641-45b6-af36-3808f0731ab4','Woodlands Estate — Emergency','Emergency Callout','b0434111-f981-43cc-9ae2-448b54c7fd6a', NOW()-INTERVAL'80 days'+TIME'07:00',NOW()-INTERVAL'80 days'+TIME'08:00','completed','manual'),
('c174e760-e641-45b6-af36-3808f0731ab4','Oak House — Consumer Unit','Consumer Unit Replacement','6904fb5d-5471-4816-8fa9-182b012a2866', NOW()-INTERVAL'77 days'+TIME'08:00',NOW()-INTERVAL'77 days'+TIME'12:00','completed','manual'),
('c174e760-e641-45b6-af36-3808f0731ab4','M. Thornton — Fault Finding','Fault Finding & Repair','4fa3a502-21cf-4f7f-8902-2b75588d4c2b', NOW()-INTERVAL'73 days'+TIME'09:00',NOW()-INTERVAL'73 days'+TIME'10:00','completed','manual'),
('c174e760-e641-45b6-af36-3808f0731ab4','Green Lane Offices — Periodic Inspection','Periodic Electrical Inspection','78ec73bf-2923-4d5e-abb0-3d25697de58f', NOW()-INTERVAL'70 days'+TIME'08:00',NOW()-INTERVAL'70 days'+TIME'10:00','completed','manual'),
('c174e760-e641-45b6-af36-3808f0731ab4','K. Bradley — EV Charger Installation','EV Charger Installation','da3636c6-1843-4c35-b8a8-d5d9dde97f10', NOW()-INTERVAL'65 days'+TIME'08:30',NOW()-INTERVAL'65 days'+TIME'11:30','completed','manual'),
('c174e760-e641-45b6-af36-3808f0731ab4','Sunrise Offices — Emergency','Emergency Callout','b0434111-f981-43cc-9ae2-448b54c7fd6a', NOW()-INTERVAL'59 days'+TIME'07:30',NOW()-INTERVAL'59 days'+TIME'08:30','completed','manual'),
('c174e760-e641-45b6-af36-3808f0731ab4','Richards Property — Consumer Unit','Consumer Unit Replacement','6904fb5d-5471-4816-8fa9-182b012a2866', NOW()-INTERVAL'53 days'+TIME'08:00',NOW()-INTERVAL'53 days'+TIME'12:00','completed','manual'),
('c174e760-e641-45b6-af36-3808f0731ab4','L. Ahmed — Fault Finding','Fault Finding & Repair','4fa3a502-21cf-4f7f-8902-2b75588d4c2b', NOW()-INTERVAL'46 days'+TIME'09:00',NOW()-INTERVAL'46 days'+TIME'10:00','no_show','manual'),
('c174e760-e641-45b6-af36-3808f0731ab4','J. Patel — Periodic Inspection','Periodic Electrical Inspection','78ec73bf-2923-4d5e-abb0-3d25697de58f', NOW()-INTERVAL'39 days'+TIME'08:00',NOW()-INTERVAL'39 days'+TIME'10:00','completed','manual'),
('c174e760-e641-45b6-af36-3808f0731ab4','Willow House — Consumer Unit','Consumer Unit Replacement','6904fb5d-5471-4816-8fa9-182b012a2866', NOW()-INTERVAL'31 days'+TIME'08:00',NOW()-INTERVAL'31 days'+TIME'12:00','completed','manual'),
('c174e760-e641-45b6-af36-3808f0731ab4','M. Thornton — EV Charger Installation','EV Charger Installation','da3636c6-1843-4c35-b8a8-d5d9dde97f10', NOW()-INTERVAL'22 days'+TIME'08:30',NOW()-INTERVAL'22 days'+TIME'11:30','completed','manual'),
('c174e760-e641-45b6-af36-3808f0731ab4','K. Bradley — Emergency','Emergency Callout','b0434111-f981-43cc-9ae2-448b54c7fd6a', NOW()-INTERVAL'14 days'+TIME'07:00',NOW()-INTERVAL'14 days'+TIME'08:00','completed','manual'),
('c174e760-e641-45b6-af36-3808f0731ab4','L. Ahmed — Consumer Unit','Consumer Unit Replacement','6904fb5d-5471-4816-8fa9-182b012a2866', NOW()-INTERVAL'7 days'+TIME'08:00',NOW()-INTERVAL'7 days'+TIME'12:00','confirmed','manual'),
('c174e760-e641-45b6-af36-3808f0731ab4','Oak House — Fault Finding','Fault Finding & Repair','4fa3a502-21cf-4f7f-8902-2b75588d4c2b', NOW()+INTERVAL'2 days'+TIME'09:00',NOW()+INTERVAL'2 days'+TIME'10:00','confirmed','manual'),
('c174e760-e641-45b6-af36-3808f0731ab4','Woodlands Estate — EV Charger','EV Charger Installation','da3636c6-1843-4c35-b8a8-d5d9dde97f10', NOW()+INTERVAL'5 days'+TIME'08:00',NOW()+INTERVAL'5 days'+TIME'11:00','provisional','manual');

-- ─── Capital Mortgage Advisers ────────────────────────────────────────────────
INSERT INTO appointments (tenant_id, title, appointment_type, service_id, start_time, end_time, status, created_from) VALUES
('f429cddd-433c-461f-b793-ee94a9f2d343','Paul & Lisa Hewitt — First-Time Buyer','First-Time Buyer Consultation','e18c23b0-f61f-43a3-96da-4b22fa6b6701', NOW()-INTERVAL'85 days'+TIME'10:00',NOW()-INTERVAL'85 days'+TIME'11:00','completed','manual'),
('f429cddd-433c-461f-b793-ee94a9f2d343','David Crane — Remortgage','Remortgage Advice','b89a753a-5008-4a43-b63d-6eccdf150961', NOW()-INTERVAL'82 days'+TIME'14:00',NOW()-INTERVAL'82 days'+TIME'14:45','completed','manual'),
('f429cddd-433c-461f-b793-ee94a9f2d343','Fiona James — Buy-to-Let Review','Buy-to-Let Mortgage Review','7890f7fc-534b-42df-8708-904e8f8bf964', NOW()-INTERVAL'78 days'+TIME'11:00',NOW()-INTERVAL'78 days'+TIME'12:00','completed','manual'),
('f429cddd-433c-461f-b793-ee94a9f2d343','Paul & Lisa Hewitt — Remortgage','Remortgage Advice','b89a753a-5008-4a43-b63d-6eccdf150961', NOW()-INTERVAL'74 days'+TIME'09:00',NOW()-INTERVAL'74 days'+TIME'09:45','completed','manual'),
('f429cddd-433c-461f-b793-ee94a9f2d343','Neil Barton — First-Time Buyer','First-Time Buyer Consultation','e18c23b0-f61f-43a3-96da-4b22fa6b6701', NOW()-INTERVAL'70 days'+TIME'14:00',NOW()-INTERVAL'70 days'+TIME'15:00','completed','manual'),
('f429cddd-433c-461f-b793-ee94a9f2d343','David Crane — Buy-to-Let Review','Buy-to-Let Mortgage Review','7890f7fc-534b-42df-8708-904e8f8bf964', NOW()-INTERVAL'63 days'+TIME'10:00',NOW()-INTERVAL'63 days'+TIME'11:00','completed','manual'),
('f429cddd-433c-461f-b793-ee94a9f2d343','Fiona James — Remortgage','Remortgage Advice','b89a753a-5008-4a43-b63d-6eccdf150961', NOW()-INTERVAL'56 days'+TIME'09:30',NOW()-INTERVAL'56 days'+TIME'10:15','no_show','manual'),
('f429cddd-433c-461f-b793-ee94a9f2d343','Rachel Singh — First-Time Buyer','First-Time Buyer Consultation','e18c23b0-f61f-43a3-96da-4b22fa6b6701', NOW()-INTERVAL'49 days'+TIME'14:00',NOW()-INTERVAL'49 days'+TIME'15:00','completed','manual'),
('f429cddd-433c-461f-b793-ee94a9f2d343','Neil Barton — Remortgage','Remortgage Advice','b89a753a-5008-4a43-b63d-6eccdf150961', NOW()-INTERVAL'42 days'+TIME'10:00',NOW()-INTERVAL'42 days'+TIME'10:45','completed','manual'),
('f429cddd-433c-461f-b793-ee94a9f2d343','Rachel Singh — Buy-to-Let Review','Buy-to-Let Mortgage Review','7890f7fc-534b-42df-8708-904e8f8bf964', NOW()-INTERVAL'35 days'+TIME'09:00',NOW()-INTERVAL'35 days'+TIME'10:00','completed','manual'),
('f429cddd-433c-461f-b793-ee94a9f2d343','David Crane — First-Time Buyer','First-Time Buyer Consultation','e18c23b0-f61f-43a3-96da-4b22fa6b6701', NOW()-INTERVAL'21 days'+TIME'14:00',NOW()-INTERVAL'21 days'+TIME'15:00','completed','manual'),
('f429cddd-433c-461f-b793-ee94a9f2d343','Fiona James — Buy-to-Let Review','Buy-to-Let Mortgage Review','7890f7fc-534b-42df-8708-904e8f8bf964', NOW()-INTERVAL'10 days'+TIME'10:00',NOW()-INTERVAL'10 days'+TIME'11:00','confirmed','manual'),
('f429cddd-433c-461f-b793-ee94a9f2d343','Paul & Lisa Hewitt — Buy-to-Let Review','Buy-to-Let Mortgage Review','7890f7fc-534b-42df-8708-904e8f8bf964', NOW()+INTERVAL'3 days'+TIME'14:00',NOW()+INTERVAL'3 days'+TIME'15:00','provisional','manual');

-- ─── Webb Financial Solutions ─────────────────────────────────────────────────
INSERT INTO appointments (tenant_id, title, appointment_type, service_id, start_time, end_time, status, created_from) VALUES
('c9939e2e-8eca-42ff-879d-74aff3abb62e','Derek Palmer — Financial Health Check','Financial Health Check','4ac81544-9615-4723-8df2-5df45e898cf0', NOW()-INTERVAL'84 days'+TIME'09:30',NOW()-INTERVAL'84 days'+TIME'10:15','completed','manual'),
('c9939e2e-8eca-42ff-879d-74aff3abb62e','Christine Brooks — Pension Review','Pension Review','c3a95907-ed56-49fb-8d82-e0023fbfecb5', NOW()-INTERVAL'81 days'+TIME'11:00',NOW()-INTERVAL'81 days'+TIME'12:00','completed','manual'),
('c9939e2e-8eca-42ff-879d-74aff3abb62e','Martin Hughes — Investment Portfolio','Investment Portfolio Review','4856586c-82d0-4edb-9df8-b9ae081a0764', NOW()-INTERVAL'77 days'+TIME'14:00',NOW()-INTERVAL'77 days'+TIME'15:00','completed','manual'),
('c9939e2e-8eca-42ff-879d-74aff3abb62e','Derek Palmer — Pension Review','Pension Review','c3a95907-ed56-49fb-8d82-e0023fbfecb5', NOW()-INTERVAL'70 days'+TIME'09:30',NOW()-INTERVAL'70 days'+TIME'10:30','completed','manual'),
('c9939e2e-8eca-42ff-879d-74aff3abb62e','Tina Crawford — Financial Health Check','Financial Health Check','4ac81544-9615-4723-8df2-5df45e898cf0', NOW()-INTERVAL'63 days'+TIME'14:00',NOW()-INTERVAL'63 days'+TIME'14:45','completed','manual'),
('c9939e2e-8eca-42ff-879d-74aff3abb62e','Christine Brooks — Investment Portfolio','Investment Portfolio Review','4856586c-82d0-4edb-9df8-b9ae081a0764', NOW()-INTERVAL'56 days'+TIME'10:00',NOW()-INTERVAL'56 days'+TIME'11:00','completed','manual'),
('c9939e2e-8eca-42ff-879d-74aff3abb62e','Martin Hughes — Pension Review','Pension Review','c3a95907-ed56-49fb-8d82-e0023fbfecb5', NOW()-INTERVAL'49 days'+TIME'14:00',NOW()-INTERVAL'49 days'+TIME'15:00','completed','manual'),
('c9939e2e-8eca-42ff-879d-74aff3abb62e','Tina Crawford — Investment Portfolio','Investment Portfolio Review','4856586c-82d0-4edb-9df8-b9ae081a0764', NOW()-INTERVAL'42 days'+TIME'09:30',NOW()-INTERVAL'42 days'+TIME'10:30','no_show','manual'),
('c9939e2e-8eca-42ff-879d-74aff3abb62e','Derek Palmer — Investment Portfolio','Investment Portfolio Review','4856586c-82d0-4edb-9df8-b9ae081a0764', NOW()-INTERVAL'35 days'+TIME'11:00',NOW()-INTERVAL'35 days'+TIME'12:00','completed','manual'),
('c9939e2e-8eca-42ff-879d-74aff3abb62e','Christine Brooks — Pension Review','Pension Review','c3a95907-ed56-49fb-8d82-e0023fbfecb5', NOW()-INTERVAL'21 days'+TIME'09:00',NOW()-INTERVAL'21 days'+TIME'10:00','completed','manual'),
('c9939e2e-8eca-42ff-879d-74aff3abb62e','Martin Hughes — Financial Health Check','Financial Health Check','4ac81544-9615-4723-8df2-5df45e898cf0', NOW()-INTERVAL'14 days'+TIME'14:00',NOW()-INTERVAL'14 days'+TIME'14:45','completed','manual'),
('c9939e2e-8eca-42ff-879d-74aff3abb62e','Tina Crawford — Pension Review','Pension Review','c3a95907-ed56-49fb-8d82-e0023fbfecb5', NOW()-INTERVAL'7 days'+TIME'10:00',NOW()-INTERVAL'7 days'+TIME'11:00','confirmed','manual'),
('c9939e2e-8eca-42ff-879d-74aff3abb62e','Derek Palmer — Investment Portfolio','Investment Portfolio Review','4856586c-82d0-4edb-9df8-b9ae081a0764', NOW()+INTERVAL'3 days'+TIME'14:00',NOW()+INTERVAL'3 days'+TIME'15:00','provisional','manual');

-- ─── Clarity Yoga & Wellbeing Studio ─────────────────────────────────────────
INSERT INTO appointments (tenant_id, title, appointment_type, service_id, start_time, end_time, status, created_from) VALUES
('7a9f6e6a-7503-4774-afd2-a1707a9a7740','Morning Group — Drop-in Class','Drop-in Class','70febdaf-da5a-4a5a-80fc-7bf3acf507a6', NOW()-INTERVAL'88 days'+TIME'07:00',NOW()-INTERVAL'88 days'+TIME'08:00','completed','manual'),
('7a9f6e6a-7503-4774-afd2-a1707a9a7740','Rachel Yip — 1-to-1 Session','1-to-1 Private Session','e4cdefcf-0bd1-4ed4-8df6-81131e364e5b', NOW()-INTERVAL'87 days'+TIME'10:00',NOW()-INTERVAL'87 days'+TIME'11:00','completed','manual'),
('7a9f6e6a-7503-4774-afd2-a1707a9a7740','Morning Group — Drop-in Class','Drop-in Class','70febdaf-da5a-4a5a-80fc-7bf3acf507a6', NOW()-INTERVAL'85 days'+TIME'07:00',NOW()-INTERVAL'85 days'+TIME'08:00','completed','manual'),
('7a9f6e6a-7503-4774-afd2-a1707a9a7740','Natalie Cross — 1-to-1 Session','1-to-1 Private Session','e4cdefcf-0bd1-4ed4-8df6-81131e364e5b', NOW()-INTERVAL'83 days'+TIME'11:00',NOW()-INTERVAL'83 days'+TIME'12:00','completed','manual'),
('7a9f6e6a-7503-4774-afd2-a1707a9a7740','Morning Group — Drop-in Class','Drop-in Class','70febdaf-da5a-4a5a-80fc-7bf3acf507a6', NOW()-INTERVAL'81 days'+TIME'07:00',NOW()-INTERVAL'81 days'+TIME'08:00','completed','manual'),
('7a9f6e6a-7503-4774-afd2-a1707a9a7740','Beginners Course May — Week 1','Beginners Course (6 weeks)','e8a39710-13bb-4458-a39b-9232f9051b44', NOW()-INTERVAL'56 days'+TIME'09:00',NOW()-INTERVAL'56 days'+TIME'10:00','completed','manual'),
('7a9f6e6a-7503-4774-afd2-a1707a9a7740','Beginners Course May — Week 2','Beginners Course (6 weeks)','e8a39710-13bb-4458-a39b-9232f9051b44', NOW()-INTERVAL'49 days'+TIME'09:00',NOW()-INTERVAL'49 days'+TIME'10:00','completed','manual'),
('7a9f6e6a-7503-4774-afd2-a1707a9a7740','Beginners Course May — Week 3','Beginners Course (6 weeks)','e8a39710-13bb-4458-a39b-9232f9051b44', NOW()-INTERVAL'42 days'+TIME'09:00',NOW()-INTERVAL'42 days'+TIME'10:00','completed','manual'),
('7a9f6e6a-7503-4774-afd2-a1707a9a7740','Rachel Yip — 1-to-1 Session','1-to-1 Private Session','e4cdefcf-0bd1-4ed4-8df6-81131e364e5b', NOW()-INTERVAL'38 days'+TIME'10:00',NOW()-INTERVAL'38 days'+TIME'11:00','completed','manual'),
('7a9f6e6a-7503-4774-afd2-a1707a9a7740','Beginners Course May — Week 4','Beginners Course (6 weeks)','e8a39710-13bb-4458-a39b-9232f9051b44', NOW()-INTERVAL'35 days'+TIME'09:00',NOW()-INTERVAL'35 days'+TIME'10:00','completed','manual'),
('7a9f6e6a-7503-4774-afd2-a1707a9a7740','Morning Group — Drop-in Class','Drop-in Class','70febdaf-da5a-4a5a-80fc-7bf3acf507a6', NOW()-INTERVAL'31 days'+TIME'07:00',NOW()-INTERVAL'31 days'+TIME'08:00','completed','manual'),
('7a9f6e6a-7503-4774-afd2-a1707a9a7740','Beginners Course May — Week 5','Beginners Course (6 weeks)','e8a39710-13bb-4458-a39b-9232f9051b44', NOW()-INTERVAL'28 days'+TIME'09:00',NOW()-INTERVAL'28 days'+TIME'10:00','completed','manual'),
('7a9f6e6a-7503-4774-afd2-a1707a9a7740','Natalie Cross — 1-to-1 Session','1-to-1 Private Session','e4cdefcf-0bd1-4ed4-8df6-81131e364e5b', NOW()-INTERVAL'24 days'+TIME'11:00',NOW()-INTERVAL'24 days'+TIME'12:00','completed','manual'),
('7a9f6e6a-7503-4774-afd2-a1707a9a7740','Beginners Course May — Week 6','Beginners Course (6 weeks)','e8a39710-13bb-4458-a39b-9232f9051b44', NOW()-INTERVAL'21 days'+TIME'09:00',NOW()-INTERVAL'21 days'+TIME'10:00','completed','manual'),
('7a9f6e6a-7503-4774-afd2-a1707a9a7740','Morning Group — Drop-in Class','Drop-in Class','70febdaf-da5a-4a5a-80fc-7bf3acf507a6', NOW()-INTERVAL'14 days'+TIME'07:00',NOW()-INTERVAL'14 days'+TIME'08:00','completed','manual'),
('7a9f6e6a-7503-4774-afd2-a1707a9a7740','Rachel Yip — 1-to-1 Session','1-to-1 Private Session','e4cdefcf-0bd1-4ed4-8df6-81131e364e5b', NOW()-INTERVAL'10 days'+TIME'10:00',NOW()-INTERVAL'10 days'+TIME'11:00','confirmed','manual'),
('7a9f6e6a-7503-4774-afd2-a1707a9a7740','Morning Group — Drop-in Class','Drop-in Class','70febdaf-da5a-4a5a-80fc-7bf3acf507a6', NOW()-INTERVAL'7 days'+TIME'07:00',NOW()-INTERVAL'7 days'+TIME'08:00','confirmed','manual'),
('7a9f6e6a-7503-4774-afd2-a1707a9a7740','Beginners Course June — Week 1','Beginners Course (6 weeks)','e8a39710-13bb-4458-a39b-9232f9051b44', NOW()+INTERVAL'1 day'+TIME'09:00',NOW()+INTERVAL'1 day'+TIME'10:00','confirmed','manual'),
('7a9f6e6a-7503-4774-afd2-a1707a9a7740','Natalie Cross — 1-to-1 Session','1-to-1 Private Session','e4cdefcf-0bd1-4ed4-8df6-81131e364e5b', NOW()+INTERVAL'3 days'+TIME'11:00',NOW()+INTERVAL'3 days'+TIME'12:00','provisional','manual');

-- ─── Sarah's Bridal Alterations ───────────────────────────────────────────────
INSERT INTO appointments (tenant_id, title, appointment_type, service_id, start_time, end_time, status, created_from) VALUES
('a60e0bdc-00df-465c-a83c-b9eccfe0aff0','Emily Warren — Dress Fitting','Dress Fitting & Alterations','be98e8d3-79ed-497a-a444-b8bdcbbb63be', NOW()-INTERVAL'85 days'+TIME'10:00',NOW()-INTERVAL'85 days'+TIME'11:30','completed','manual'),
('a60e0bdc-00df-465c-a83c-b9eccfe0aff0','Jessica Hall — Bridesmaid Alterations','Bridesmaid Dress Alterations','3e0958df-4009-4c6a-bd0c-948d92ed7136', NOW()-INTERVAL'80 days'+TIME'14:00',NOW()-INTERVAL'80 days'+TIME'15:00','completed','manual'),
('a60e0bdc-00df-465c-a83c-b9eccfe0aff0','Sophie Grant — Rush Alteration','Rush Alteration (7 days)','7dd9549d-c226-48f1-b6a5-41d3926fa97f', NOW()-INTERVAL'74 days'+TIME'11:00',NOW()-INTERVAL'74 days'+TIME'12:30','completed','manual'),
('a60e0bdc-00df-465c-a83c-b9eccfe0aff0','Emily Warren — Dress Fitting','Dress Fitting & Alterations','be98e8d3-79ed-497a-a444-b8bdcbbb63be', NOW()-INTERVAL'65 days'+TIME'10:00',NOW()-INTERVAL'65 days'+TIME'11:30','completed','manual'),
('a60e0bdc-00df-465c-a83c-b9eccfe0aff0','Lauren Park — Dress Fitting','Dress Fitting & Alterations','be98e8d3-79ed-497a-a444-b8bdcbbb63be', NOW()-INTERVAL'57 days'+TIME'14:00',NOW()-INTERVAL'57 days'+TIME'15:30','completed','manual'),
('a60e0bdc-00df-465c-a83c-b9eccfe0aff0','Jessica Hall — Rush Alteration','Rush Alteration (7 days)','7dd9549d-c226-48f1-b6a5-41d3926fa97f', NOW()-INTERVAL'49 days'+TIME'11:00',NOW()-INTERVAL'49 days'+TIME'12:30','completed','manual'),
('a60e0bdc-00df-465c-a83c-b9eccfe0aff0','Sophie Grant — Bridesmaid Alterations','Bridesmaid Dress Alterations','3e0958df-4009-4c6a-bd0c-948d92ed7136', NOW()-INTERVAL'40 days'+TIME'09:30',NOW()-INTERVAL'40 days'+TIME'10:30','completed','manual'),
('a60e0bdc-00df-465c-a83c-b9eccfe0aff0','Lauren Park — Bridesmaid Alterations','Bridesmaid Dress Alterations','3e0958df-4009-4c6a-bd0c-948d92ed7136', NOW()-INTERVAL'28 days'+TIME'14:00',NOW()-INTERVAL'28 days'+TIME'15:00','completed','manual'),
('a60e0bdc-00df-465c-a83c-b9eccfe0aff0','Emily Warren — Rush Alteration','Rush Alteration (7 days)','7dd9549d-c226-48f1-b6a5-41d3926fa97f', NOW()-INTERVAL'18 days'+TIME'10:00',NOW()-INTERVAL'18 days'+TIME'11:30','no_show','manual'),
('a60e0bdc-00df-465c-a83c-b9eccfe0aff0','Jessica Hall — Dress Fitting','Dress Fitting & Alterations','be98e8d3-79ed-497a-a444-b8bdcbbb63be', NOW()-INTERVAL'9 days'+TIME'14:00',NOW()-INTERVAL'9 days'+TIME'15:30','confirmed','manual'),
('a60e0bdc-00df-465c-a83c-b9eccfe0aff0','Sophie Grant — Dress Fitting','Dress Fitting & Alterations','be98e8d3-79ed-497a-a444-b8bdcbbb63be', NOW()+INTERVAL'4 days'+TIME'10:00',NOW()+INTERVAL'4 days'+TIME'11:30','provisional','manual');

-- ─── Apex Commercial Cleaning ─────────────────────────────────────────────────
INSERT INTO appointments (tenant_id, title, appointment_type, service_id, start_time, end_time, status, created_from) VALUES
('a0d47125-3406-43f6-805a-38cd46253bf1','Sunrise Office Park — Regular Contract','Regular Contract Cleaning','a2dda2da-a7ae-47dd-b03d-44e418c3b8bb', NOW()-INTERVAL'84 days'+TIME'06:00',NOW()-INTERVAL'84 days'+TIME'08:00','completed','manual'),
('a0d47125-3406-43f6-805a-38cd46253bf1','Sunrise Office Park — Regular Contract','Regular Contract Cleaning','a2dda2da-a7ae-47dd-b03d-44e418c3b8bb', NOW()-INTERVAL'77 days'+TIME'06:00',NOW()-INTERVAL'77 days'+TIME'08:00','completed','manual'),
('a0d47125-3406-43f6-805a-38cd46253bf1','Meridian Business Centre — Deep Clean','Office Deep Clean','beba1294-e6db-4c58-83aa-bb1878bbb108', NOW()-INTERVAL'72 days'+TIME'06:00',NOW()-INTERVAL'72 days'+TIME'09:00','completed','manual'),
('a0d47125-3406-43f6-805a-38cd46253bf1','Sunrise Office Park — Regular Contract','Regular Contract Cleaning','a2dda2da-a7ae-47dd-b03d-44e418c3b8bb', NOW()-INTERVAL'70 days'+TIME'06:00',NOW()-INTERVAL'70 days'+TIME'08:00','completed','manual'),
('a0d47125-3406-43f6-805a-38cd46253bf1','Parkway Logistics — Industrial Floor','Industrial Floor Cleaning','f6bc31c3-ecd4-4995-8bfb-97cccffcd942', NOW()-INTERVAL'65 days'+TIME'05:00',NOW()-INTERVAL'65 days'+TIME'09:00','completed','manual'),
('a0d47125-3406-43f6-805a-38cd46253bf1','Sunrise Office Park — Regular Contract','Regular Contract Cleaning','a2dda2da-a7ae-47dd-b03d-44e418c3b8bb', NOW()-INTERVAL'63 days'+TIME'06:00',NOW()-INTERVAL'63 days'+TIME'08:00','completed','manual'),
('a0d47125-3406-43f6-805a-38cd46253bf1','Castle Street Emergency — Emergency Clean','Emergency Specialist Clean','70129b34-2da9-4bbd-b10a-1a58404bad50', NOW()-INTERVAL'58 days'+TIME'07:00',NOW()-INTERVAL'58 days'+TIME'11:00','completed','manual'),
('a0d47125-3406-43f6-805a-38cd46253bf1','Sunrise Office Park — Regular Contract','Regular Contract Cleaning','a2dda2da-a7ae-47dd-b03d-44e418c3b8bb', NOW()-INTERVAL'56 days'+TIME'06:00',NOW()-INTERVAL'56 days'+TIME'08:00','completed','manual'),
('a0d47125-3406-43f6-805a-38cd46253bf1','Meridian Business Centre — Regular Contract','Regular Contract Cleaning','a2dda2da-a7ae-47dd-b03d-44e418c3b8bb', NOW()-INTERVAL'49 days'+TIME'06:00',NOW()-INTERVAL'49 days'+TIME'08:00','completed','manual'),
('a0d47125-3406-43f6-805a-38cd46253bf1','Sunrise Office Park — Regular Contract','Regular Contract Cleaning','a2dda2da-a7ae-47dd-b03d-44e418c3b8bb', NOW()-INTERVAL'42 days'+TIME'06:00',NOW()-INTERVAL'42 days'+TIME'08:00','completed','manual'),
('a0d47125-3406-43f6-805a-38cd46253bf1','Parkway Logistics — Deep Clean','Office Deep Clean','beba1294-e6db-4c58-83aa-bb1878bbb108', NOW()-INTERVAL'36 days'+TIME'05:00',NOW()-INTERVAL'36 days'+TIME'08:00','completed','manual'),
('a0d47125-3406-43f6-805a-38cd46253bf1','Sunrise Office Park — Regular Contract','Regular Contract Cleaning','a2dda2da-a7ae-47dd-b03d-44e418c3b8bb', NOW()-INTERVAL'35 days'+TIME'06:00',NOW()-INTERVAL'35 days'+TIME'08:00','completed','manual'),
('a0d47125-3406-43f6-805a-38cd46253bf1','Meridian Business Centre — Regular Contract','Regular Contract Cleaning','a2dda2da-a7ae-47dd-b03d-44e418c3b8bb', NOW()-INTERVAL'28 days'+TIME'06:00',NOW()-INTERVAL'28 days'+TIME'08:00','completed','manual'),
('a0d47125-3406-43f6-805a-38cd46253bf1','Sunrise Office Park — Regular Contract','Regular Contract Cleaning','a2dda2da-a7ae-47dd-b03d-44e418c3b8bb', NOW()-INTERVAL'21 days'+TIME'06:00',NOW()-INTERVAL'21 days'+TIME'08:00','completed','manual'),
('a0d47125-3406-43f6-805a-38cd46253bf1','Parkway Logistics — Industrial Floor','Industrial Floor Cleaning','f6bc31c3-ecd4-4995-8bfb-97cccffcd942', NOW()-INTERVAL'15 days'+TIME'05:00',NOW()-INTERVAL'15 days'+TIME'09:00','completed','manual'),
('a0d47125-3406-43f6-805a-38cd46253bf1','Meridian Business Centre — Regular Contract','Regular Contract Cleaning','a2dda2da-a7ae-47dd-b03d-44e418c3b8bb', NOW()-INTERVAL'14 days'+TIME'06:00',NOW()-INTERVAL'14 days'+TIME'08:00','completed','manual'),
('a0d47125-3406-43f6-805a-38cd46253bf1','Sunrise Office Park — Regular Contract','Regular Contract Cleaning','a2dda2da-a7ae-47dd-b03d-44e418c3b8bb', NOW()-INTERVAL'7 days'+TIME'06:00',NOW()-INTERVAL'7 days'+TIME'08:00','confirmed','manual'),
('a0d47125-3406-43f6-805a-38cd46253bf1','Meridian Business Centre — Regular Contract','Regular Contract Cleaning','a2dda2da-a7ae-47dd-b03d-44e418c3b8bb', NOW()+INTERVAL'3 days'+TIME'06:00',NOW()+INTERVAL'3 days'+TIME'08:00','confirmed','manual'),
('a0d47125-3406-43f6-805a-38cd46253bf1','Sunrise Office Park — Regular Contract','Regular Contract Cleaning','a2dda2da-a7ae-47dd-b03d-44e418c3b8bb', NOW()+INTERVAL'7 days'+TIME'06:00',NOW()+INTERVAL'7 days'+TIME'08:00','provisional','manual');
