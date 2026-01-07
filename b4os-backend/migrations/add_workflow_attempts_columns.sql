-- Migration: Add GitHub Actions workflow tracking columns to zzz_assignment_attempts
-- Description: Adds columns to track student attempts via GitHub Actions workflow runs
-- Date: 2025-12-11

-- Add workflow attempt tracking columns
ALTER TABLE zzz_assignment_attempts
ADD COLUMN IF NOT EXISTS total_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS successful_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_attempt_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN zzz_assignment_attempts.total_attempts IS 'Total number of GitHub Actions workflow runs for this assignment attempt';
COMMENT ON COLUMN zzz_assignment_attempts.successful_attempts IS 'Number of successful workflow runs (conclusion = success)';
COMMENT ON COLUMN zzz_assignment_attempts.failed_attempts IS 'Number of failed workflow runs (conclusion = failure)';
COMMENT ON COLUMN zzz_assignment_attempts.first_attempt_at IS 'Timestamp of the first workflow run';
COMMENT ON COLUMN zzz_assignment_attempts.last_attempt_at IS 'Timestamp of the most recent workflow run';

-- Create index for querying by attempt timestamps
CREATE INDEX IF NOT EXISTS idx_assignment_attempts_last_attempt
ON zzz_assignment_attempts(last_attempt_at DESC);

-- Create index for querying by total attempts
CREATE INDEX IF NOT EXISTS idx_assignment_attempts_total
ON zzz_assignment_attempts(total_attempts DESC);

-- Add unique constraint on (user_id, assignment_id) for upsert operations
ALTER TABLE zzz_assignment_attempts
DROP CONSTRAINT IF EXISTS zzz_assignment_attempts_user_assignment_unique;

ALTER TABLE zzz_assignment_attempts
ADD CONSTRAINT zzz_assignment_attempts_user_assignment_unique
UNIQUE (user_id, assignment_id);

-- Optional: Create a view to easily see assignment attempt statistics
CREATE OR REPLACE VIEW vw_assignment_attempt_stats AS
SELECT
    aa.id,
    aa.user_id,
    aa.assignment_id,
    aa.repo_url,
    aa.total_attempts,
    aa.successful_attempts,
    aa.failed_attempts,
    aa.first_attempt_at,
    aa.last_attempt_at,
    aa.fork_created_at,
    aa.fork_updated_at,
    aa.updated_at,
    -- Calculate success rate
    CASE
        WHEN aa.total_attempts > 0
        THEN ROUND((aa.successful_attempts::NUMERIC / aa.total_attempts::NUMERIC) * 100, 2)
        ELSE 0
    END AS success_rate_percentage,
    -- Calculate time between first and last attempt
    CASE
        WHEN aa.first_attempt_at IS NOT NULL AND aa.last_attempt_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (aa.last_attempt_at - aa.first_attempt_at)) / 3600
        ELSE NULL
    END AS attempt_duration_hours
FROM zzz_assignment_attempts aa;

COMMENT ON VIEW vw_assignment_attempt_stats IS 'View showing assignment attempt statistics with calculated metrics like success rate and attempt duration';
