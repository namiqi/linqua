import type { WordStatus } from "./constants";

export interface ExtractedWordEntry {
  lemma: string;
  occurrence_count: number;
}

export interface Lesson {
  id: string;
  user_id: string;
  name: string;
  transcript: string;
  extracted_words: ExtractedWordEntry[];
  created_at: string;
  reviewed_at: string | null;
}

export interface Word {
  id: string;
  user_id: string;
  lemma: string;
  translation: string | null;
  status: WordStatus;
  source_lesson_id: string | null;
  learning_started_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonWord {
  lesson_id: string;
  word_id: string;
  occurrence_count: number;
}

export type StoryStatus = "generating" | "ready" | "failed";

export interface Story {
  id: string;
  user_id: string;
  title: string;
  content_ru: string;
  known_word_pct: number | null;
  stretch_words: string[];
  status: StoryStatus;
  created_at: string;
}

export interface DashboardStats {
  totalWords: number;
  knownWords: number;
  learningWords: number;
  lessonCount: number;
  storiesUnlocked: boolean;
}

export interface LessonWithStats extends Lesson {
  wordCount: number;
  newCount: number;
  reviewedCount: number;
}

export interface ReviewWord {
  lemma: string;
  occurrence_count: number;
  existingWord: Word | null;
  skipped: boolean;
}

export interface PracticeSentence {
  id: string;
  user_id: string;
  prompt_en: string;
  answer_ru: string;
  source_lesson_id: string | null;
  created_at: string;
}

export interface DrillSession {
  id: string;
  user_id: string;
  drill_number: number;
  name: string;
  created_at: string;
}

export interface DrillSessionSummary extends DrillSession {
  total: number;
  correct: number;
}

export interface DrillSessionEntry {
  id: string;
  session_id: string;
  word_lemma: string;
  direction: "en_to_ru" | "ru_to_en";
  prompt: string;
  answer_given: string;
  expected_answer: string;
  correct: boolean;
  created_at: string;
}
