import { extractWords } from "./russian/extract";
import type { ExtractedWordEntry } from "./types";

export function getLessonExtractedWords(lesson: {
  transcript: string;
  extracted_words?: unknown;
}): ExtractedWordEntry[] {
  const stored = lesson.extracted_words;
  if (Array.isArray(stored) && stored.length > 0) {
    return stored as ExtractedWordEntry[];
  }
  return extractWords(lesson.transcript);
}

export function formatDbError(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: string }).message);
    if (message.includes("invalid input syntax for type uuid")) {
      return "DEV_USER_ID must be a valid UUID in your environment variables.";
    }
    if (message.toLowerCase().includes("supabase environment")) {
      return message;
    }
    return message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

export function isMissingExtractedWordsColumn(error: {
  message?: string;
  code?: string;
}): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("extracted_words") ||
    message.includes("could not find") ||
    error.code === "PGRST204"
  );
}

export function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: string }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
