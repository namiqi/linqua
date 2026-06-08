export function isHtmlResponse(text: string): boolean {
  const trimmed = text.trimStart().toLowerCase();
  return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
}

export async function readJsonResponse<T = Record<string, unknown>>(
  res: Response
): Promise<T> {
  const text = await res.text();

  if (isHtmlResponse(text)) {
    const status = res.status;
    if (status === 504 || status === 502) {
      throw new Error(
        "Server timed out while generating the story. Try again, or use a shorter story length."
      );
    }
    throw new Error(
      "Server returned an error page instead of data. Try again in a moment."
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      text.slice(0, 200).trim() || "Invalid response from server"
    );
  }
}

export function parseJsonText<T>(text: string, context: string): T {
  if (isHtmlResponse(text)) {
    throw new Error(`${context} returned an HTML error page`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${context} returned invalid JSON`);
  }
}
