CREATE TABLE IF NOT EXISTS practice_sentences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  prompt_en TEXT NOT NULL,
  answer_ru TEXT NOT NULL,
  source_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phrase_drill_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  sentence_id UUID NOT NULL REFERENCES practice_sentences(id) ON DELETE CASCADE,
  correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_sentences_user ON practice_sentences(user_id);
CREATE INDEX IF NOT EXISTS idx_phrase_drill_results_user ON phrase_drill_results(user_id);
CREATE INDEX IF NOT EXISTS idx_phrase_drill_results_sentence ON phrase_drill_results(sentence_id);
