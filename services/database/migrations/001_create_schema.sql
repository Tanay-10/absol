-- 001_create_schema.sql
-- Full schema for the insurance early-warning system.
-- Run against a PostgreSQL 15+ database (Supabase compatible).

BEGIN;

-- ============================================================
-- EVENT DOMAIN
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_id    text UNIQUE NOT NULL,
    source          text NOT NULL,
    event_family    text NOT NULL CHECK (event_family IN ('natural', 'human_caused')),
    event_type      text NOT NULL,
    event_subtype   text,
    title           text NOT NULL,
    summary         text,
    severity_label  text NOT NULL CHECK (severity_label IN ('minor','moderate','major','severe','critical')),
    severity_score  int  NOT NULL CHECK (severity_score BETWEEN 0 AND 100),
    status          text NOT NULL DEFAULT 'unknown' CHECK (status IN ('active','ended','unknown')),
    occurred_at     timestamptz,
    detected_at     timestamptz NOT NULL,
    geometry_type   text NOT NULL CHECK (geometry_type IN ('point','bbox','admin_area','polygon')),
    latitude        double precision CHECK (latitude BETWEEN -90 AND 90),
    longitude       double precision CHECK (longitude BETWEEN -180 AND 180),
    bbox            double precision[],
    region_name     text,
    country_codes   text[] DEFAULT '{}',
    severity_inputs jsonb DEFAULT '{}',
    source_url      text,
    schema_version  text NOT NULL DEFAULT 'v1',
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_events_type ON events (event_type);
CREATE INDEX idx_events_occurred ON events (occurred_at DESC);
CREATE INDEX idx_events_location ON events (latitude, longitude);

CREATE TABLE IF NOT EXISTS impact_zones (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     uuid UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    zone_type    text NOT NULL CHECK (zone_type IN ('radius', 'bbox', 'admin_area')),
    center_lat   double precision,
    center_lon   double precision,
    radius_km    double precision,
    bbox         double precision[],
    admin_region text,
    country_code text,
    computed_at  timestamptz DEFAULT now()
);

-- ============================================================
-- INSURANCE DOMAIN
-- ============================================================

CREATE TABLE IF NOT EXISTS policyholders (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL,
    type       text NOT NULL CHECK (type IN ('individual', 'business')),
    email      text,
    phone      text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policies (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policyholder_id   uuid NOT NULL REFERENCES policyholders(id) ON DELETE CASCADE,
    policy_number     text UNIQUE NOT NULL,
    policy_type       text NOT NULL CHECK (policy_type IN ('property','auto','life','health','commercial','liability')),
    status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
    coverage_amount   numeric NOT NULL,
    deductible        numeric NOT NULL DEFAULT 0,
    premium_annual    numeric NOT NULL,
    effective_date    date NOT NULL,
    expiry_date       date NOT NULL,
    covered_perils    text[] NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_policies_holder ON policies (policyholder_id);
CREATE INDEX idx_policies_type ON policies (policy_type);

CREATE TABLE IF NOT EXISTS insured_locations (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id      uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    label          text NOT NULL,
    latitude       double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude      double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    address        text,
    city           text,
    state_province text,
    country_code   text NOT NULL,
    property_value numeric
);

CREATE INDEX idx_locations_coords ON insured_locations (latitude, longitude);
CREATE INDEX idx_locations_country ON insured_locations (country_code);

-- ============================================================
-- LINKING DOMAIN
-- ============================================================

CREATE TABLE IF NOT EXISTS exposure_matches (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    policy_id    uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    location_id  uuid NOT NULL REFERENCES insured_locations(id) ON DELETE CASCADE,
    distance_km  double precision,
    match_method text NOT NULL CHECK (match_method IN ('radius','bbox_overlap','admin_match')),
    matched_at   timestamptz DEFAULT now(),
    UNIQUE (event_id, policy_id, location_id)
);

CREATE INDEX idx_matches_event ON exposure_matches (event_id);
CREATE INDEX idx_matches_policy ON exposure_matches (policy_id);

CREATE TABLE IF NOT EXISTS claim_estimates (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exposure_match_id  uuid UNIQUE NOT NULL REFERENCES exposure_matches(id) ON DELETE CASCADE,
    claim_probability  double precision NOT NULL CHECK (claim_probability BETWEEN 0 AND 1),
    estimated_amount   numeric NOT NULL,
    risk_factors       jsonb NOT NULL,
    computed_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id                 uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    alert_level              text NOT NULL CHECK (alert_level IN ('low','medium','high','critical')),
    total_policies_affected  int NOT NULL,
    estimated_claim_count    int NOT NULL,
    estimated_total_amount   numeric NOT NULL,
    recommended_action       text NOT NULL,
    generated_at             timestamptz DEFAULT now(),
    sent_via                 text[] DEFAULT '{}',
    sent_at                  timestamptz
);

CREATE INDEX idx_alerts_event ON alerts (event_id);
CREATE INDEX idx_alerts_level ON alerts (alert_level);

-- ============================================================
-- REFERENCE DATA
-- ============================================================

CREATE TABLE IF NOT EXISTS event_policy_relevance (
    event_type          text NOT NULL,
    policy_type         text NOT NULL,
    is_relevant         boolean NOT NULL,
    base_claim_rate     double precision NOT NULL,
    severity_multiplier double precision NOT NULL DEFAULT 1.0,
    PRIMARY KEY (event_type, policy_type)
);

COMMIT;
