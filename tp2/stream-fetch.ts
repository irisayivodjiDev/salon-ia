// TP 2.2 — Streaming avec fetch + votre parseur, et mesure de la latence perçue.
//   npm run tp2:stream -- "votre question"
//   STOP_MS=1500 npm run tp2:stream      → coupe le flux au bout de 1,5 s (AbortController)
import { config, requireKey } from "../src/config.js";
import { parseSSE } from "./sse.js";

type Chunk = {
  model: string;
  error?: { message: string; type?: string; code?: string | null }; // erreur en plein flux : le statut HTTP était déjà 200
  choices: { delta: { content?: string }; finish_reason: string | null }[];
  usage?: { prompt_tokens: number; completion_tokens: number };
};

const question = process.argv.slice(2).join(" ") || "Explique le streaming HTTP en cinq phrases.";
const controller = new AbortController();
if (process.env.STOP_MS) setTimeout(() => controller.abort(), Number(process.env.STOP_MS));

const t0 = performance.now();
let ttft: number | null = null;
let usage: Chunk["usage"];
let pieces = 0;

try {
  const res = await fetch(`${config.baseURL}/chat/completions`, {
    method: "POST",
    signal: controller.signal,
    headers: { Authorization: `Bearer ${requireKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      stream: true,
      stream_options: { include_usage: true }, // sans cette option, pas d'usage dans le flux
      messages: [{ role: "user", content: question }] }),
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} : ${await res.text()}`);
  console.log("content-type :", res.headers.get("content-type"), "\n");

  // TODO : Itérer sur parseSSE(res.body), parser chaque événement en JSON, lever une erreur si l'événement contient un champ error, afficher le delta avec process.stdout.write, noter le temps du premier morceau (ttft), compter les morceaux et récupérer usage s'il est présent.
    for await (const data of parseSSE(res.body)) {
    const chunk = JSON.parse(data) as Chunk;

    if (chunk.error) {
      throw new Error(chunk.error.message);
    }

    const delta = chunk.choices[0]?.delta?.content ?? "";

    if (delta) {
      if (ttft === null) {
        ttft = performance.now() - t0;
      }
      process.stdout.write(delta);
      pieces++;
    }

    if (chunk.usage) {
      usage = chunk.usage;
    }
  }
} catch (e) {
  if ((e as Error).name === "AbortError") console.log("\n\n[flux interrompu par AbortController]");
  else console.error(`\n\n⚠️  ${(e as Error).message}`); // ex. MOCK_STREAM_ERROR_RATE=1 npm run mock
}

const total = performance.now() - t0;
console.log("\n\n---");
console.log(`premier token (TTFT) : ${ttft ? Math.round(ttft) : "—"} ms`);
console.log(`réponse complète     : ${Math.round(total)} ms, ${pieces} morceaux`);
if (usage && ttft) {
  const tps = usage.completion_tokens / ((total - ttft) / 1000);
  console.log(`débit                : ~${tps.toFixed(0)} tokens/s · usage ${usage.prompt_tokens} + ${usage.completion_tokens}`);
}
