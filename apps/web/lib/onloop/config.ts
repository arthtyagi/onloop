export const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb" as const;
export const TTS_MODEL = "eleven_v3" as const;
export const TTS_OUTPUT_FORMAT = "mp3_44100_128" as const;

export const INTRO_SFX_PROMPT =
  "Podcast intro chime, bright, professional, 2 seconds" as const;
export const OUTRO_SFX_PROMPT =
  "Podcast outro chime, soft, fading, 2 seconds" as const;
export const SFX_DURATION_SEC = 2;

export const K_DEFAULT = 1;
export const K_MAX = 3;
export const K_SUBJECT_REGEX = /\[K=(\d)\]/;

export const SCRIPT_MIN_WORDS = 250;
export const SCRIPT_MAX_WORDS = 500;
export const MIN_IDEA_LENGTH = 10;
export const MAX_IDEAS = 10;

export const INBOUND_EMAIL = "tasks@onloop.work" as const;

export const PODCAST_TITLE = "onloop";
export const PODCAST_DESCRIPTION =
  "AI-managed multimedia pipeline — podcast episodes from email.";
export const PODCAST_LANGUAGE = "en-us";
export const PODCAST_CATEGORY = "Technology";
export const PODCAST_AUTHOR = "onloop";
export const PODCAST_OWNER_NAME = "onloop";

export const TRIAGE_MODEL = "openai/gpt-5.4-mini";
export const RESEARCH_MODEL = "openai/gpt-5.4-mini";
export const SCRIPT_MODEL = "openai/gpt-5.4-mini";

export const MP3_BITRATE_KBPS = 128;
export const EPISODE_MP3_PATH_PREFIX = "episodes";
