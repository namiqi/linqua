-- Store extracted words on the lesson until the user reviews them
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS extracted_words JSONB NOT NULL DEFAULT '[]'::jsonb;
