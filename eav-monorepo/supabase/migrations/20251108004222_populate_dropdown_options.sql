-- ============================================================================
-- Populate dropdown_options with reference data from production
-- ============================================================================
-- Purpose: Insert dropdown reference data that defines form options
-- Source: Dumped from production database (zbxvjyrbkycbfhwmmnmy)
-- Date: 2025-11-08
-- ============================================================================

-- Location Start Point Options
INSERT INTO dropdown_options (field_name, option_value, option_label, sort_order) VALUES
('location_start_point', 'Any', 'Any', 1),
('location_start_point', 'Kitchen', 'Kitchen', 2),
('location_start_point', 'Living Room', 'Living Room', 3),
('location_start_point', 'Bedroom', 'Bedroom', 4),
('location_start_point', 'Bathroom', 'Bathroom', 5),
('location_start_point', 'Ensuite', 'Ensuite', 6),
('location_start_point', 'Hallway', 'Hallway', 7),
('location_start_point', 'Balcony', 'Balcony', 8),
('location_start_point', 'Utility', 'Utility', 9),
('location_start_point', 'Concierge', 'Concierge', 10),
('location_start_point', 'Building Exterior', 'Building Exterior', 11),
('location_start_point', 'Car Park', 'Car Park', 12),
('location_start_point', 'Garden', 'Garden', 13),
('location_start_point', 'Gym', 'Gym', 14),
('location_start_point', 'Bin Store', 'Bin Store', 15),
('location_start_point', 'Bike Store', 'Bike Store', 16),
('location_start_point', 'Garage', 'Garage', 17),
('location_start_point', 'Other', 'Other', 999)
ON CONFLICT (field_name, option_value) DO NOTHING;

-- Movement Type Options (formerly tracking_type)
INSERT INTO dropdown_options (field_name, option_value, option_label, sort_order) VALUES
('movement_type', 'Tracking', 'Tracking', 1),
('movement_type', 'Establishing', 'Establishing', 2),
('movement_type', 'Standard', 'Standard', 3),
('movement_type', 'Photos', 'Photos', 4)
ON CONFLICT (field_name, option_value) DO NOTHING;

-- Shot Type Options
INSERT INTO dropdown_options (field_name, option_value, option_label, sort_order) VALUES
('shot_type', 'WS', 'WS', 1),
('shot_type', 'MID', 'MID', 2),
('shot_type', 'CU', 'CU', 3),
('shot_type', 'FP', 'FP', 4),
('shot_type', 'OBJ-L', 'OBJ-L', 5),
('shot_type', 'OBJ-R', 'OBJ-R', 6),
('shot_type', 'UNDER', 'UNDER', 7)
ON CONFLICT (field_name, option_value) DO NOTHING;

-- Subject Options
INSERT INTO dropdown_options (field_name, option_value, option_label, sort_order) VALUES
('subject', 'Standard', 'Standard', 1),
('subject', 'Other', 'Other', 999)
ON CONFLICT (field_name, option_value) DO NOTHING;
