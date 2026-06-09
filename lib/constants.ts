export const STORY_UNLOCK_THRESHOLD = 500;

/** Days after marking a word as learning before it can be claimed as known in drill */
export const LEARNING_TO_KNOWN_DAYS = 7;

export const USER_ID_COOKIE = "linqua_user_id";

export type WordStatus = "known" | "learning";
export type DrillDirection = "en_to_ru" | "ru_to_en" | "random";
