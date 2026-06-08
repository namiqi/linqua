import { isStopWord } from "./stopwords";

const CYRILLIC_WORD = /[\u0400-\u04FF]+/gu;

export interface ExtractedWord {
  lemma: string;
  occurrence_count: number;
}

export function extractWords(transcript: string): ExtractedWord[] {
  const matches = transcript.match(CYRILLIC_WORD) ?? [];
  const counts = new Map<string, number>();

  for (const raw of matches) {
    const lemma = raw.toLowerCase();
    if (lemma.length < 2 || isStopWord(lemma)) continue;
    counts.set(lemma, (counts.get(lemma) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([lemma, occurrence_count]) => ({ lemma, occurrence_count }))
    .sort((a, b) => b.occurrence_count - a.occurrence_count);
}
