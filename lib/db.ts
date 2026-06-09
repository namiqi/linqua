import { STORY_UNLOCK_THRESHOLD } from "./constants";
import { createServiceClient } from "./supabase/server";
import type {
  DashboardStats,
  Lesson,
  LessonWithStats,
  ReviewWord,
  Story,
  Word,
  PracticeSentence,
} from "./types";
import { extractWords } from "./russian/extract";
import { canClaimAsKnown } from "./training/promotion";
import {
  formatDbError,
  getLessonExtractedWords,
  isMissingExtractedWordsColumn,
} from "./errors";
import { INITIAL_VOCAB } from "./seed/initial-vocab";

const BATCH_SIZE = 200;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const supabase = createServiceClient();

  const [wordsResult, lessonsResult] = await Promise.all([
    supabase.from("words").select("status").eq("user_id", userId),
    supabase.from("lessons").select("id", { count: "exact" }).eq("user_id", userId),
  ]);

  const words = wordsResult.data ?? [];
  const knownWords = words.filter((w) => w.status === "known").length;
  const learningWords = words.filter((w) => w.status === "learning").length;

  return {
    totalWords: words.length,
    knownWords,
    learningWords,
    lessonCount: lessonsResult.count ?? 0,
    storiesUnlocked: knownWords >= STORY_UNLOCK_THRESHOLD,
  };
}

export async function getLessons(userId: string): Promise<LessonWithStats[]> {
  const supabase = createServiceClient();

  const { data: lessons, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!lessons?.length) return [];

  const lessonIds = lessons.map((l) => l.id);
  const { data: lessonWords } = await supabase
    .from("lesson_words")
    .select("lesson_id, word_id")
    .in("lesson_id", lessonIds);

  const wordIds = [...new Set((lessonWords ?? []).map((lw) => lw.word_id))];
  const { data: wordsData } = wordIds.length
    ? await supabase.from("words").select("id, status").in("id", wordIds)
    : { data: [] };

  const wordStatusMap = new Map(
    (wordsData ?? []).map((w) => [w.id, w.status as string])
  );

  return lessons.map((lesson) => {
    const extracted = getLessonExtractedWords(lesson);
    const entries =
      lessonWords?.filter((lw) => lw.lesson_id === lesson.id) ?? [];
    const newCount = entries.filter(
      (e) => wordStatusMap.get(e.word_id) === "learning"
    ).length;
    const wordCount = extracted.length > 0 ? extracted.length : entries.length;

    return {
      ...(lesson as Lesson),
      wordCount,
      newCount,
      reviewedCount: entries.length,
    };
  });
}

export async function createLesson(
  userId: string,
  name: string,
  transcript: string
): Promise<string> {
  const supabase = createServiceClient();
  const extracted = extractWords(transcript);

  let result = await supabase
    .from("lessons")
    .insert({
      user_id: userId,
      name,
      transcript,
      extracted_words: extracted,
    })
    .select("id")
    .single();

  if (result.error && isMissingExtractedWordsColumn(result.error)) {
    result = await supabase
      .from("lessons")
      .insert({ user_id: userId, name, transcript })
      .select("id")
      .single();
  }

  if (result.error || !result.data) {
    throw new Error(formatDbError(result.error ?? new Error("Failed to create lesson")));
  }

  return result.data.id;
}

export async function getLessonReviewWords(
  userId: string,
  lessonId: string
): Promise<{ lesson: Lesson; words: ReviewWord[] }> {
  const supabase = createServiceClient();

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .eq("user_id", userId)
    .single();

  if (lessonError || !lesson) throw lessonError ?? new Error("Lesson not found");

  const extracted = getLessonExtractedWords(lesson);

  if (extracted.length === 0) {
    return { lesson: lesson as Lesson, words: [] };
  }

  const lemmas = extracted.map((e) => e.lemma);
  const existingByLemma = new Map<string, Word>();

  for (const lemmaBatch of chunk(lemmas, BATCH_SIZE)) {
    const { data: existingWords, error } = await supabase
      .from("words")
      .select("*")
      .eq("user_id", userId)
      .in("lemma", lemmaBatch);

    if (error) throw error;
    for (const word of existingWords ?? []) {
      existingByLemma.set(word.lemma, word as Word);
    }
  }

  const { data: reviewedLinks } = await supabase
    .from("lesson_words")
    .select("word_id")
    .eq("lesson_id", lessonId);

  const reviewedWordIds = (reviewedLinks ?? []).map((link) => link.word_id);
  const reviewedLemmas = new Set<string>();
  for (const idBatch of chunk(reviewedWordIds, BATCH_SIZE)) {
    const { data: reviewedWords } = await supabase
      .from("words")
      .select("lemma")
      .in("id", idBatch);
    for (const word of reviewedWords ?? []) {
      reviewedLemmas.add(word.lemma);
    }
  }

  const words: ReviewWord[] = extracted.map(({ lemma, occurrence_count }) => {
    const existingWord = existingByLemma.get(lemma) ?? null;
    const alreadyReviewed =
      reviewedLemmas.has(lemma) ||
      existingWord?.source_lesson_id === lessonId;
    const skipped =
      existingWord?.status === "known" && !alreadyReviewed;

    return {
      lemma,
      occurrence_count,
      existingWord,
      skipped: skipped || alreadyReviewed,
    };
  });

  return { lesson: lesson as Lesson, words };
}

export async function reviewWord(
  userId: string,
  lessonId: string,
  lemma: string,
  status: "known" | "learning",
  translation?: string,
  occurrenceCount = 1
): Promise<void> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("words")
    .select("*")
    .eq("user_id", userId)
    .eq("lemma", lemma)
    .maybeSingle();

  const now = new Date().toISOString();
  const learningStartedAt =
    status === "learning"
      ? (existing?.learning_started_at ?? now)
      : null;

  const payload = {
    status,
    updated_at: now,
    source_lesson_id: lessonId,
    learning_started_at: learningStartedAt,
    ...(translation !== undefined ? { translation: translation || null } : {}),
  };

  let wordId: string;

  if (existing) {
    const { data: updated, error } = await supabase
      .from("words")
      .update(payload)
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error || !updated) throw error ?? new Error("Failed to update word");
    wordId = updated.id;
  } else {
    const { data: inserted, error } = await supabase
      .from("words")
      .insert({
        user_id: userId,
        lemma,
        status,
        source_lesson_id: lessonId,
        translation: translation || null,
        learning_started_at: status === "learning" ? now : null,
      })
      .select("id")
      .single();
    if (error || !inserted) throw error ?? new Error("Failed to add word");
    wordId = inserted.id;
  }

  const { error: linkError } = await supabase.from("lesson_words").upsert(
    {
      lesson_id: lessonId,
      word_id: wordId,
      occurrence_count: occurrenceCount,
    },
    { onConflict: "lesson_id,word_id" }
  );
  if (linkError) throw linkError;
}

export async function markLessonReviewed(
  userId: string,
  lessonId: string
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("lessons")
    .update({ reviewed_at: new Date().toISOString() })
    .eq("id", lessonId)
    .eq("user_id", userId);
}

export async function getWords(
  userId: string,
  status?: "known" | "learning" | "all"
): Promise<Word[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("words")
    .select("*")
    .eq("user_id", userId)
    .order("lemma");

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...(row as Word),
    learning_started_at: (row as Word).learning_started_at ?? null,
  }));
}

export async function saveTrainingResult(
  userId: string,
  wordId: string,
  direction: "en_to_ru" | "ru_to_en",
  correct: boolean
): Promise<{ attempts: number; correct: number }> {
  const supabase = createServiceClient();
  await supabase.from("training_results").insert({
    user_id: userId,
    word_id: wordId,
    direction,
    correct,
  });

  const { data, error } = await supabase
    .from("training_results")
    .select("correct")
    .eq("user_id", userId)
    .eq("word_id", wordId);

  if (error) throw error;
  const attempts = data?.length ?? 0;
  const correctCount = data?.filter((r) => r.correct).length ?? 0;
  return { attempts, correct: correctCount };
}

export async function getTrainingStatsForWords(
  userId: string,
  wordIds: string[]
): Promise<Map<string, { attempts: number; correct: number }>> {
  const stats = new Map<string, { attempts: number; correct: number }>();
  if (wordIds.length === 0) return stats;

  const supabase = createServiceClient();
  for (const idBatch of chunk(wordIds, BATCH_SIZE)) {
    const { data, error } = await supabase
      .from("training_results")
      .select("word_id, correct")
      .eq("user_id", userId)
      .in("word_id", idBatch);

    if (error) throw error;
    for (const row of data ?? []) {
      const current = stats.get(row.word_id) ?? { attempts: 0, correct: 0 };
      current.attempts++;
      if (row.correct) current.correct++;
      stats.set(row.word_id, current);
    }
  }

  return stats;
}

export async function promoteWordToKnown(
  userId: string,
  wordId: string
): Promise<void> {
  const supabase = createServiceClient();
  const { data: word, error: fetchError } = await supabase
    .from("words")
    .select("status, learning_started_at")
    .eq("user_id", userId)
    .eq("id", wordId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!word) throw new Error("Word not found");
  if (word.status !== "learning") {
    throw new Error("Only learning words can be promoted");
  }

  if (!canClaimAsKnown(word.status, word.learning_started_at)) {
    throw new Error("This word is not ready to claim as known yet");
  }

  const { error } = await supabase
    .from("words")
    .update({
      status: "known",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", wordId);

  if (error) throw error;
}

export async function getStories(userId: string): Promise<Story[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((s) => ({
    ...s,
    stretch_words: (s.stretch_words as string[]) ?? [],
    status: (s.status as Story["status"]) ?? "ready",
  })) as Story[];
}

export async function getStory(
  userId: string,
  storyId: string
): Promise<Story | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("id", storyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  let status = (data.status as Story["status"]) ?? "ready";
  if (
    !data.status &&
    data.title.startsWith("Generating") &&
    !data.content_ru
  ) {
    status = "generating";
  }
  return {
    ...data,
    stretch_words: (data.stretch_words as string[]) ?? [],
    status,
  } as Story;
}

export async function createGeneratingStory(userId: string): Promise<string> {
  const supabase = createServiceClient();
  let result = await supabase
    .from("stories")
    .insert({
      user_id: userId,
      title: "Generating your story…",
      content_ru: "",
      known_word_pct: null,
      stretch_words: [],
      status: "generating",
    })
    .select("id")
    .single();

  if (result.error?.message?.includes("status")) {
    result = await supabase
      .from("stories")
      .insert({
        user_id: userId,
        title: "Generating your story…",
        content_ru: "",
        known_word_pct: null,
        stretch_words: [],
      })
      .select("id")
      .single();
  }

  if (result.error || !result.data) {
    throw result.error ?? new Error("Failed to create story");
  }
  return result.data.id;
}

export async function updateStory(
  storyId: string,
  userId: string,
  update: {
    title: string;
    contentRu: string;
    knownWordPct: number;
    stretchWords: string[];
    status: Story["status"];
  }
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("stories")
    .update({
      title: update.title,
      content_ru: update.contentRu,
      known_word_pct: update.knownWordPct,
      stretch_words: update.stretchWords,
      status: update.status,
    })
    .eq("id", storyId)
    .eq("user_id", userId);

  if (error?.message?.includes("status")) {
    const { error: retryError } = await supabase
      .from("stories")
      .update({
        title: update.title,
        content_ru: update.contentRu,
        known_word_pct: update.knownWordPct,
        stretch_words: update.stretchWords,
      })
      .eq("id", storyId)
      .eq("user_id", userId);
    if (retryError) throw retryError;
    return;
  }

  if (error) throw error;
}

export async function createStory(
  userId: string,
  title: string,
  contentRu: string,
  knownWordPct: number,
  stretchWords: string[]
): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("stories")
    .insert({
      user_id: userId,
      title,
      content_ru: contentRu,
      known_word_pct: knownWordPct,
      stretch_words: stretchWords,
      status: "ready",
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create story");
  return data.id;
}

export async function addStretchWordsAsLearning(
  userId: string,
  lemmas: string[]
): Promise<void> {
  const supabase = createServiceClient();
  for (const lemma of lemmas) {
    const { data: existing } = await supabase
      .from("words")
      .select("id, learning_started_at")
      .eq("user_id", userId)
      .eq("lemma", lemma)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("words")
        .update({
          status: "learning",
          learning_started_at: existing.learning_started_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("words").insert({
        user_id: userId,
        lemma,
        status: "learning",
        learning_started_at: new Date().toISOString(),
      });
    }
  }
}

export async function getPracticeSentences(userId: string): Promise<PracticeSentence[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("practice_sentences")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PracticeSentence[];
}

export async function addPracticeSentence(
  userId: string,
  promptEn: string,
  answerRu: string,
  sourceLessonId?: string
): Promise<PracticeSentence> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("practice_sentences")
    .insert({
      user_id: userId,
      prompt_en: promptEn.trim(),
      answer_ru: answerRu.trim(),
      source_lesson_id: sourceLessonId ?? null,
    })
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("Failed to add phrase");
  return data as PracticeSentence;
}

export async function getPhraseDrillStatsForSentences(
  userId: string,
  sentenceIds: string[]
): Promise<Map<string, { attempts: number; correct: number }>> {
  const stats = new Map<string, { attempts: number; correct: number }>();
  if (sentenceIds.length === 0) return stats;

  const supabase = createServiceClient();
  for (const idBatch of chunk(sentenceIds, BATCH_SIZE)) {
    const { data, error } = await supabase
      .from("phrase_drill_results")
      .select("sentence_id, correct")
      .eq("user_id", userId)
      .in("sentence_id", idBatch);

    if (error) throw error;
    for (const row of data ?? []) {
      const current = stats.get(row.sentence_id) ?? { attempts: 0, correct: 0 };
      current.attempts++;
      if (row.correct) current.correct++;
      stats.set(row.sentence_id, current);
    }
  }

  return stats;
}

export async function savePhraseDrillResult(
  userId: string,
  sentenceId: string,
  correct: boolean
): Promise<{ attempts: number; correct: number }> {
  const supabase = createServiceClient();
  await supabase.from("phrase_drill_results").insert({
    user_id: userId,
    sentence_id: sentenceId,
    correct,
  });

  const { data, error } = await supabase
    .from("phrase_drill_results")
    .select("correct")
    .eq("user_id", userId)
    .eq("sentence_id", sentenceId);

  if (error) throw error;
  const attempts = data?.length ?? 0;
  const correctCount = data?.filter((r) => r.correct).length ?? 0;
  return { attempts, correct: correctCount };
}

export async function resetUserData(userId: string): Promise<void> {
  const supabase = createServiceClient();

  const { error: phraseResultsError } = await supabase
    .from("phrase_drill_results")
    .delete()
    .eq("user_id", userId);
  if (phraseResultsError && !phraseResultsError.message.includes("does not exist")) {
    throw phraseResultsError;
  }

  const { error: phrasesError } = await supabase
    .from("practice_sentences")
    .delete()
    .eq("user_id", userId);
  if (phrasesError && !phrasesError.message.includes("does not exist")) {
    throw phrasesError;
  }

  const { error: trainingError } = await supabase
    .from("training_results")
    .delete()
    .eq("user_id", userId);
  if (trainingError) throw trainingError;

  const { error: storiesError } = await supabase
    .from("stories")
    .delete()
    .eq("user_id", userId);
  if (storiesError) throw storiesError;

  const { error: lessonsError } = await supabase
    .from("lessons")
    .delete()
    .eq("user_id", userId);
  if (lessonsError) throw lessonsError;

  const { error: wordsError } = await supabase
    .from("words")
    .delete()
    .eq("user_id", userId);
  if (wordsError) throw wordsError;
}

export async function seedInitialVocab(userId: string): Promise<number> {
  const supabase = createServiceClient();

  const seen = new Set<string>();
  const rows = INITIAL_VOCAB.filter(({ lemma }) => {
    const key = lemma.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(({ lemma, translation }) => ({
    user_id: userId,
    lemma: lemma.toLowerCase().trim(),
    translation,
    status: "known" as const,
    updated_at: new Date().toISOString(),
  }));

  for (const batch of chunk(rows, BATCH_SIZE)) {
    const { error } = await supabase.from("words").upsert(batch, {
      onConflict: "user_id,lemma",
    });
    if (error) throw error;
  }

  return rows.length;
}
