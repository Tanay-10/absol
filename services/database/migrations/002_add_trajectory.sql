-- Migration: Add Trajectory support for mobile/expanding events
-- Date: 2026-04-23

ALTER TABLE events
  ADD COLUMN is_mobile          BOOLEAN  DEFAULT 0;

ALTER TABLE events
  ADD COLUMN trajectory_bounds  TEXT     DEFAULT NULL;

ALTER TABLE events
  ADD COLUMN trajectory         TEXT     DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_events_mobile
  ON events (is_mobile) WHERE is_mobile = 1;
