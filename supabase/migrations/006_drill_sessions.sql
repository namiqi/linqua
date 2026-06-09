CREATE TABLE IF NOT EXISTS drill_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  drill_number INT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drill_session_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES drill_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  word_id UUID REFERENCES words(id) ON DELETE SET NULL,
  word_lemma TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('en_to_ru', 'ru_to_en')),
  prompt TEXT NOT NULL,
  answer_given TEXT NOT NULL,
  expected_answer TEXT NOT NULL,
  correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drill_sessions_user ON drill_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drill_session_entries_session ON drill_session_entries(session_id);
