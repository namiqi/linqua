-- Linqua initial schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  transcript TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE words (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  lemma TEXT NOT NULL,
  translation TEXT,
  status TEXT NOT NULL CHECK (status IN ('known', 'learning')),
  source_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, lemma)
);

CREATE TABLE lesson_words (
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  occurrence_count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (lesson_id, word_id)
);

CREATE TABLE training_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('en_to_ru', 'ru_to_en')),
  correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content_ru TEXT NOT NULL,
  known_word_pct NUMERIC(5, 2),
  stretch_words JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lessons_user_id ON lessons(user_id);
CREATE INDEX idx_words_user_id ON words(user_id);
CREATE INDEX idx_words_status ON words(user_id, status);
CREATE INDEX idx_training_results_user_id ON training_results(user_id);
CREATE INDEX idx_stories_user_id ON stories(user_id);
