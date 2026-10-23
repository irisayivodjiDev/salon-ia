// OPTIONNEL A.1 — Où va l'argent, et comment le cache de prompt le réduit.
//
// Le cache de prompt d'OpenAI est automatique : si le DÉBUT de votre requête (au moins 1 024 tokens)
// est identique à une requête récente, ces tokens sont facturés beaucoup moins cher et traités plus vite.
// Condition : le préfixe stable d'abord (consignes, documents), le variable à la fin.
//
//   npm run optA:cache            (renseignez PRIX_* dans .env pour voir les coûts en dollars)
import { config, cout, openai, prix } from "../src/config.js";
import { CHARTE } from "./charte.js";

const client = openai();
const tickets = [
  "Plus personne ne peut encaisser sur Orion Caisse depuis 8 h, on ouvre à midi !",
  "Serait-il possible d'exporter les rapports d'Orion Stock en CSV ?",
  "On a été facturés deux fois pour octobre, merci de rembourser.",
];

async function appel(label: string, system: string, ticket: string) {
  const t0 = performance.now();
  // TODO : Appeler client.chat.completions.create avec [system, user], max_tokens 60, puis afficher : tokens d'entrée, dont en cache (usage.prompt_tokens_details.cached_tokens), tokens de sortie, latence et coût (fonction cout).
  console.log(label, "à implémenter", system.length, ticket.length, t0);
}

console.log("1) Préfixe stable : la charte d'abord, toujours identique");
for (const t of tickets) await appel("   charte puis ticket", CHARTE, t);

console.log("\n2) Préfixe cassé : l'heure exacte AVANT la charte (erreur fréquente)");
for (const t of tickets) await appel("   heure puis charte", `Nous sommes le ${new Date().toISOString()}.\n\n${CHARTE}`, t);

if (!prix.renseignes) console.log("\n(Renseignez PRIX_ENTREE, PRIX_ENTREE_CACHE et PRIX_SORTIE dans .env pour afficher les coûts.)");
console.log("À observer : à partir du 2e appel du cas 1, une partie de l'entrée est en cache ; jamais dans le cas 2.");
