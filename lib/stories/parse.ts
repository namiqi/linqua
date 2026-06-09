export interface ParsedStoryJson {
  title: string;
  content_ru: string;
  stretch_words: string[];
}

export class EmptyGeminiResponseError extends Error {
  constructor(message = "Gemini returned an empty response") {
    super(message);
    this.name = "EmptyGeminiResponseError";
  }
}

export class InvalidStoryJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidStoryJsonError";
  }
}

function stripMarkdownFences(text: string): string {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  return cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
}

function extractBalancedJson(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") depth++;
    if (char === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function tryParseObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // try next strategy
  }
  return null;
}

function validateStoryObject(obj: Record<string, unknown>): ParsedStoryJson {
  const title = obj.title;
  const contentRu = obj.content_ru ?? obj.contentRu;
  const stretchWords = obj.stretch_words ?? obj.stretchWords;

  if (typeof title !== "string" || !title.trim()) {
    throw new InvalidStoryJsonError("Story JSON missing a valid title");
  }
  if (typeof contentRu !== "string" || !contentRu.trim()) {
    throw new InvalidStoryJsonError("Story JSON missing valid content_ru");
  }

  const stretchList = Array.isArray(stretchWords)
    ? stretchWords.filter((w): w is string => typeof w === "string")
    : [];

  return {
    title: title.trim(),
    content_ru: contentRu.trim(),
    stretch_words: stretchList,
  };
}

export function parseStoryJson(raw: string): ParsedStoryJson {
  if (!raw?.trim()) {
    throw new EmptyGeminiResponseError();
  }

  const cleaned = stripMarkdownFences(raw);

  const strategies = [
    cleaned,
    extractBalancedJson(cleaned),
    extractBalancedJson(raw),
  ].filter((s): s is string => Boolean(s));

  for (const candidate of strategies) {
    const obj = tryParseObject(candidate);
    if (obj) {
      return validateStoryObject(obj);
    }
  }

  throw new InvalidStoryJsonError("Failed to parse story from Gemini response");
}

export function isParseOrEmptyError(error: unknown): boolean {
  if (error instanceof EmptyGeminiResponseError) return true;
  if (error instanceof InvalidStoryJsonError) return true;
  if (error instanceof SyntaxError) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("failed to parse") ||
      msg.includes("empty response") ||
      msg.includes("invalid story json") ||
      msg.includes("invalid json")
    );
  }
  return false;
}
