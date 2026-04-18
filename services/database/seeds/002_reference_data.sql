-- 002_reference_data.sql
-- Seed the event_policy_relevance lookup table.
-- Run AFTER 001_create_schema.sql.

BEGIN;

INSERT INTO event_policy_relevance (event_type, policy_type, is_relevant, base_claim_rate, severity_multiplier) VALUES
-- earthquake
('earthquake', 'property',   true,  0.35, 1.5),
('earthquake', 'auto',       true,  0.10, 1.2),
('earthquake', 'life',       true,  0.02, 2.0),
('earthquake', 'health',     true,  0.05, 1.8),
('earthquake', 'commercial', true,  0.30, 1.5),
('earthquake', 'liability',  true,  0.08, 1.3),
-- flood
('flood', 'property',   true,  0.40, 1.3),
('flood', 'auto',       true,  0.25, 1.3),
('flood', 'life',       false, 0.00, 1.0),
('flood', 'health',     false, 0.00, 1.0),
('flood', 'commercial', true,  0.35, 1.3),
('flood', 'liability',  true,  0.05, 1.1),
-- wildfire
('wildfire', 'property',   true,  0.50, 1.4),
('wildfire', 'auto',       true,  0.15, 1.2),
('wildfire', 'life',       false, 0.00, 1.0),
('wildfire', 'health',     true,  0.03, 1.5),
('wildfire', 'commercial', true,  0.40, 1.4),
('wildfire', 'liability',  false, 0.00, 1.0),
-- cyclone
('cyclone', 'property',   true,  0.45, 1.6),
('cyclone', 'auto',       true,  0.20, 1.3),
('cyclone', 'life',       true,  0.03, 2.0),
('cyclone', 'health',     true,  0.05, 1.5),
('cyclone', 'commercial', true,  0.40, 1.5),
('cyclone', 'liability',  true,  0.08, 1.2),
-- storm
('storm', 'property',   true,  0.30, 1.3),
('storm', 'auto',       true,  0.20, 1.2),
('storm', 'life',       false, 0.00, 1.0),
('storm', 'health',     false, 0.00, 1.0),
('storm', 'commercial', true,  0.25, 1.3),
('storm', 'liability',  false, 0.00, 1.0),
-- tornado
('tornado', 'property',   true,  0.55, 1.7),
('tornado', 'auto',       true,  0.30, 1.4),
('tornado', 'life',       true,  0.04, 2.2),
('tornado', 'health',     true,  0.06, 1.8),
('tornado', 'commercial', true,  0.45, 1.6),
('tornado', 'liability',  true,  0.10, 1.3),
-- tsunami
('tsunami', 'property',   true,  0.60, 1.8),
('tsunami', 'auto',       true,  0.25, 1.5),
('tsunami', 'life',       true,  0.08, 2.5),
('tsunami', 'health',     true,  0.10, 2.0),
('tsunami', 'commercial', true,  0.50, 1.7),
('tsunami', 'liability',  true,  0.10, 1.4),
-- volcano
('volcano', 'property',   true,  0.35, 1.5),
('volcano', 'auto',       true,  0.10, 1.2),
('volcano', 'life',       true,  0.03, 2.0),
('volcano', 'health',     true,  0.05, 1.8),
('volcano', 'commercial', true,  0.30, 1.4),
('volcano', 'liability',  false, 0.00, 1.0),
-- drought
('drought', 'property',   true,  0.10, 1.1),
('drought', 'auto',       false, 0.00, 1.0),
('drought', 'life',       false, 0.00, 1.0),
('drought', 'health',     false, 0.00, 1.0),
('drought', 'commercial', true,  0.15, 1.2),
('drought', 'liability',  false, 0.00, 1.0),
-- conflict
('conflict', 'property',   true,  0.40, 1.8),
('conflict', 'auto',       true,  0.20, 1.5),
('conflict', 'life',       true,  0.05, 2.5),
('conflict', 'health',     true,  0.08, 2.0),
('conflict', 'commercial', true,  0.35, 1.8),
('conflict', 'liability',  true,  0.12, 1.5),
-- terrorism
('terrorism', 'property',   true,  0.35, 2.0),
('terrorism', 'auto',       true,  0.15, 1.5),
('terrorism', 'life',       true,  0.06, 2.5),
('terrorism', 'health',     true,  0.10, 2.2),
('terrorism', 'commercial', true,  0.30, 2.0),
('terrorism', 'liability',  true,  0.15, 1.8),
-- industrial
('industrial', 'property',   true,  0.30, 1.5),
('industrial', 'auto',       true,  0.05, 1.1),
('industrial', 'life',       true,  0.03, 2.0),
('industrial', 'health',     true,  0.15, 2.0),
('industrial', 'commercial', true,  0.35, 1.6),
('industrial', 'liability',  true,  0.25, 1.8),
-- other
('other', 'property',   true,  0.10, 1.0),
('other', 'auto',       true,  0.05, 1.0),
('other', 'life',       false, 0.00, 1.0),
('other', 'health',     false, 0.00, 1.0),
('other', 'commercial', true,  0.10, 1.0),
('other', 'liability',  false, 0.00, 1.0)
ON CONFLICT (event_type, policy_type) DO NOTHING;

COMMIT;
