// TP 1.2 — Le même appel avec fetch, sans SDK : tout ce qu'un SDK fait pour vous.
import { config, requireKey } from "../src/config.js";

const question = process.argv.slice(2).join(" ") || "Donne trois usages d'un LLM dans une application métier.";

const t0 = performance.now();
// TODO : Envoyer la requête POST vers ${config.baseURL}/chat/completions : 
// en-têtes Authorization et Content-Type, corps JSON avec 
// model, messages (un system + un user), temperature et 
// max_tokens.
const res: Response = await fetch(`${config.baseURL}/chat/completions`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${requireKey()}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: config.model,
    messages: [
      { role: "system", content: "Tu réponds en français." },
      { role: "user", content: question },
    ],
    temperature: 0.2,
    max_tokens: 120,
  }),
});

if (!res.ok) {
  const erreur = await res.text();
  console.error(`Erreur HTTP ${res.status} : ${erreur}`);
  process.exit(1);
}

const data = (await res.json()) as {
  model: string;
  choices: {
    message: { content: string | null };
    finish_reason: string | null;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

const choix = data.choices[0];
if (!choix || choix.message.content === null) {
  throw new Error("La réponse ne contient pas de texte.");
}
const ms = Math.round(performance.now() - t0);
const requetesRestantes = res.headers.get("x-ratelimit-remaining-requests");
// TODO : Afficher le texte de la réponse, le modèle exact 
// (data.model : la version datée derrière l'alias), 
// la raison d'arrêt (finish_reason), l'usage en tokens, la 
// latence et les requêtes restantes 
// (en-tête x-ratelimit-remaining-requests).
console.log(`Réponse : ${choix.message.content}`);
console.log(`Modèle exact : ${data.model}`);
console.log(`Raison d'arrêt : ${choix.finish_reason}`);
console.log(
  `Tokens : ${data.usage.prompt_tokens} en entrée, ${data.usage.completion_tokens} en sortie, ${data.usage.total_tokens} au total`,
);
console.log(`Latence : ${ms} ms`);
console.log(`Requêtes restantes : ${requetesRestantes ?? "non communiqué"}`);


