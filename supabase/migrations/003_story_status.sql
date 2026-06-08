ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ready'
    CHECK (status IN ('generating', 'ready', 'failed'));
