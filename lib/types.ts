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
