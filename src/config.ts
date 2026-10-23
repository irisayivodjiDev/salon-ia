// Configuration commune (config, openai(), requireKey(), cout()). Rien à modifier ici : tout se règle dans .env.
import OpenAI from "openai";

try {
  process.loadEnvFile();
} catch {
}

function env(name: string, defaut: string): string {
  const v = process.env[name]?.trim();
  return v ? v : defaut;
}

const baseURL = env("OPENAI_BASE_URL", "https://api.openai.com/v1").replace(/\/$/, "");

export const config = {
  apiKey: env("OPENAI_API_KEY", ""),
  baseURL,
  model: env("OPENAI_MODEL", "gpt-4.1-mini"),
  realtimeModel: env("OPENAI_REALTIME_MODEL", "gpt-realtime-2.1-mini"),
  realtimeURL: baseURL.replace(/^http/, "ws") + "/realtime",
  ttsModel: env("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"),
  sttModel: env("OPENAI_STT_MODEL", "gpt-4o-transcribe"),
  imageModel: env("OPENAI_IMAGE_MODEL", "gpt-image-2.5-flare"),
  isOpenAI: /(^|\.)openai\.com/.test(new URL(baseURL).hostname),
};

export const prix = {
  entree: Number(process.env.PRIX_ENTREE ?? 0),
  entreeCache: Number(process.env.PRIX_ENTREE_CACHE ?? 0),
  sortie: Number(process.env.PRIX_SORTIE ?? 0),
  renseignes: Boolean(process.env.PRIX_ENTREE && process.env.PRIX_SORTIE),
};

export function cout(usage: {
  prompt_tokens?: number; completion_tokens?: number; input_tokens?: number; output_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number } | null; input_tokens_details?: { cached_tokens?: number } | null;
}): number {
  const entree = usage.prompt_tokens ?? usage.input_tokens ?? 0;
  const sortie = usage.completion_tokens ?? usage.output_tokens ?? 0;
  const cache = usage.prompt_tokens_details?.cached_tokens ?? usage.input_tokens_details?.cached_tokens ?? 0;
  return ((entree - cache) * prix.entree + cache * prix.entreeCache + sortie * prix.sortie) / 1_000_000;
}

export function requireKey(): string {
  if (!config.apiKey) {
    console.error(
      "OPENAI_API_KEY manquante. Copiez .env.example en .env et renseignez la clé fournie.\n" +
        "(Avec le faux serveur `npm run mock`, n'importe quelle valeur non vide convient.)",
    );
    process.exit(1);
  }
  return config.apiKey;
}

export function openai(): OpenAI {
  return new OpenAI({ apiKey: requireKey(), baseURL: config.baseURL, timeout: 60_000, maxRetries: 3 });
}
