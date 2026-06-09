import type { Word } from "../types";

export function isMissingTranslation(translation: string | null): boolean {
  return !translation?.trim();
}

/** Missing English translations first, then alphabetical by Russian lemma. */
export function sortVocabWords(words: Word[]): Word[] {
  return [...words].sort((a, b) => {
    const aMissing = isMissingTranslation(a.translation);
    const bMissing = isMissingTranslation(b.translation);
    if (aMissing !== bMissing) return aMissing ? -1 : 1;
    return a.lemma.localeCompare(b.lemma, "ru");
  });
}
