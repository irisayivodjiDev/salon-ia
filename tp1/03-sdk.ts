// TP 1.3 — Le SDK officiel d'OpenAI : même requête, typée, avec retries et timeouts.
import { config, openai } from "../src/config.js";

const client = openai();

// TODO : Appeler client.chat.completions.create avec le modèle de config, un message system et un message user, 
// puis afficher le contenu, le modèle qui a répondu et l'usage.
const question =
  process.argv.slice(2).join(" ") ||
  "Donne trois usages d'un LLM dans une application métier.";

const reponse = await client.chat.completions.create({
  model: config.model,
  messages: [
    { role: "system", content: "Tu réponds en français." },
    { role: "user", content: question },
  ],
});

const choix = reponse.choices[0];
if (!choix) {
  throw new Error("La réponse ne contient aucun choix.");
}

console.log(`Réponse : ${choix.message.content ?? "Aucun texte"}`);
console.log(`Modèle : ${reponse.model}`);

if (reponse.usage) {
  console.log(
    `Tokens : ${reponse.usage.prompt_tokens} en entrée, ${reponse.usage.completion_tokens} en sortie, ${reponse.usage.total_tokens} au total`,
  );
} else {
  console.log("Usage des tokens non communiqué.");
}
// À observer : changez OPENAI_BASE_URL (faux serveur, autre fournisseur compatible) : le code ne bouge pas.
// C'est ça, un standard de fait.

//await un fetch
