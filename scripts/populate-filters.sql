-- Populate filters table with cabin and air filters
-- Run with: psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f scripts/populate-filters.sql

-- Insert cabin filters
INSERT INTO filters (code, name, description, type, model_qty, stock_quantity, is_active) VALUES
('WCF0040', 'CABIN FILTER TOYOTA/SUBARU', 'Cabin filter for Toyota and Subaru vehicles', 'Cabin Filter', 3, 3, true),
('WCF0163', 'CABIN FILTER MAZDA', 'Cabin filter for Mazda vehicles', 'Cabin Filter', 3, 3, true),
('WCF0195', 'CABIN FILTER AUDI/VW', 'Cabin filter for Audi and VW vehicles', 'Cabin Filter', 2, 2, true),
('WCF0025', 'CABIN FILTER VW/AUDI', 'Cabin filter for VW and Audi vehicles', 'Cabin Filter', 2, 2, true),
('WCF0090', 'CABIN FILTER MITSU/NISSAN', 'Cabin filter for Mitsubishi and Nissan vehicles', 'Cabin Filter', 2, 2, true),
('WCF0077', 'CABIN FILTER NISSAN XTRAIL/DUALIS', 'Cabin filter for Nissan X-Trail and Dualis', 'Cabin Filter', 1, 1, true),
('WCF0005', 'CABIN FILTER HYUNDAI/KIA', 'Cabin filter for Hyundai and Kia vehicles', 'Cabin Filter', 1, 1, true),
('WCF0106', 'CABIN FILTER HONDA', 'Cabin filter for Honda vehicles', 'Cabin Filter', 1, 1, true),
('WCF0158', 'CABIN FILTER HYUNDAI', 'Cabin filter for Hyundai vehicles', 'Cabin Filter', 1, 1, true),
('WCF0215', 'CABIN FILTER TOYOTA/MAZDA', 'Cabin filter for Toyota and Mazda vehicles', 'Cabin Filter', 1, 1, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  model_qty = EXCLUDED.model_qty,
  stock_quantity = EXCLUDED.stock_quantity,
  updated_at = CURRENT_TIMESTAMP;

-- Insert air filters
INSERT INTO filters (code, name, description, type, model_qty, stock_quantity, is_active) VALUES
('WA5042', 'AIR FILTER TOYOTA COROLLA/YARIS', 'Air filter for Toyota Corolla and Yaris', 'Air Filter', 3, 3, true),
('WA5247', 'AIR FILTER MAZDA', 'Air filter for Mazda vehicles', 'Air Filter', 3, 3, true),
('WA5338', 'AIR FILTER VW/AUDI/SKODA', 'Air filter for VW, Audi and Skoda vehicles', 'Air Filter', 2, 2, true),
('WA5385', 'AIR FILTER HYUNDAI/KIA', 'Air filter for Hyundai and Kia vehicles', 'Air Filter', 2, 2, true),
('WA5447', 'AIR FILTER HYUNDAI', 'Air filter for Hyundai vehicles', 'Air Filter', 2, 2, true),
('WA1184', 'AIR FILTER SUBARU', 'Air filter for Subaru vehicles', 'Air Filter', 2, 2, true),
('WA5369', 'AIR FILTER AUDI/SKODA/VW', 'Air filter for Audi, Skoda and VW vehicles', 'Air Filter', 2, 2, true),
('WA5422', 'AIR FILTER HYUNDAI/KIA', 'Air filter for Hyundai and Kia vehicles', 'Air Filter', 1, 1, true),
('WA1185', 'AIR FILTER MAZDA', 'Air filter for Mazda vehicles', 'Air Filter', 1, 1, true),
('WA5177', 'AIR FILTER HONDA', 'Air filter for Honda vehicles', 'Air Filter', 1, 1, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  model_qty = EXCLUDED.model_qty,
  stock_quantity = EXCLUDED.stock_quantity,
  updated_at = CURRENT_TIMESTAMP;

-- Display inserted records
SELECT code, name, type, model_qty, stock_quantity 
FROM filters 
WHERE code IN (
  'WCF0040', 'WCF0163', 'WCF0195', 'WCF0025', 'WCF0090', 'WCF0077', 'WCF0005', 'WCF0106', 'WCF0158', 'WCF0215',
  'WA5042', 'WA5247', 'WA5338', 'WA5385', 'WA5447', 'WA1184', 'WA5369', 'WA5422', 'WA1185', 'WA5177'
)
ORDER BY type, code;
