// TP 3 — Banc d'essai du client résilient.
// Lancez le faux serveur avec des pannes :  MOCK_FAIL_RATE=0.4 npm run mock
// puis :                                    npm run tp3:demo
// Pour voir le limiteur à l'œuvre : MOCK_RPM=3 npm run mock, puis comparez
//   MIN_INTERVAL_MS=0 npm run tp3:demo   (rafale → 429)   et   MIN_INTERVAL_MS=20000 npm run tp3:demo
// Banc d'essai prévu pour le faux serveur : sur la vraie API, il dépense 6 requêtes pour rien.
import { chat } from "./llm.js";

const t0 = Date.now();
const stamp = () => `${String(Date.now() - t0).padStart(5)} ms`;

// Cinq requêtes lancées EN MÊME TEMPS. Sans limiteur, au-delà de la limite : 429. Avec : elles passent une par une.
const questions = ["Un mot pour dire vite", "Un mot pour dire lent", "Un synonyme de robuste", "Un antonyme de fragile", "Un mot pour dire fiable"];
const results = await Promise.allSettled(
  questions.map(async (q, i) => {
    console.log(`${stamp()}  #${i} mise en file`);
    const { text, usage } = await chat([{ role: "user", content: `${q}. Réponds en un seul mot.` }], { maxTokens: 20 });
    console.log(`${stamp()}  #${i} ✓ ${text.trim().slice(0, 50)} (${usage.total_tokens} tokens)`);
  }),
);
const failed = results.filter((r) => r.status === "rejected");
console.log(`\n${results.length - failed.length}/${results.length} réussies en ${Date.now() - t0} ms`);
failed.forEach((f) => console.log("  ✗", (f as PromiseRejectedResult).reason.message));

// Annulation : on coupe une requête au bout de 200 ms.
const ctrl = new AbortController();
setTimeout(() => ctrl.abort(), 200);
try {
  await chat([{ role: "user", content: "Écris un long poème." }], { signal: ctrl.signal });
} catch (e) {
  console.log(`\nAnnulation : ${(e as Error).name} — pas de retry sur une annulation voulue.`);
}
