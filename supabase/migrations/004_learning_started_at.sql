ALTER TABLE words
  ADD COLUMN IF NOT EXISTS learning_started_at TIMESTAMPTZ;

-- Existing learning words: clock starts from when they were added
UPDATE words
SET learning_started_at = created_at
WHERE status = 'learning' AND learning_started_at IS NULL;
