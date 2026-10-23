// OPTIONNEL C — Le SDK Agents d'OpenAI (@openai/agents) : la boucle du TP 4, écrite pour vous.
//
// Ce qu'il apporte par rapport à votre boucle maison :
//   • des outils décrits avec zod, validés automatiquement (tool())
//   • des passages de relais entre agents spécialisés (handoffs)
//   • des garde-fous en entrée (guardrails)
//   • des traces de chaque exécution (tracing), consultables dans le tableau de bord OpenAI
// Ce qu'il coûte : une dépendance de plus, et une boucle que vous ne voyez plus.
//
//   npm run optC:agents -- "Réserve une salle pour 8 demain 10 h, rétro du sprint"
import { z } from "zod";
import { Agent, run, tool, setDefaultOpenAIClient, setTracingDisabled, InputGuardrailTripwireTriggered } from "@openai/agents";
import { config, openai } from "../src/config.js";

setDefaultOpenAIClient(openai());
if (!config.isOpenAI) setTracingDisabled(true);

// --- Le même « système d'information » fictif qu'au TP 4 -------------------
const demain = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
const salles = [
  { id: "S-ATLAS", nom: "Atlas", places: 4 },
  { id: "S-BOREAL", nom: "Boréal", places: 10 },
  { id: "S-CAP", nom: "Cap", places: 16 },
];
const reservations = [{ salle_id: "S-BOREAL", date: demain, debut: "14:00", fin: "15:00" }];

// TODO : Définir les deux outils avec tool({ name, description, parameters: z.object(...), execute }) : chercher_salles(date, participants) et reserver_salle(salle_id, date, debut, fin, objet). execute renvoie un objet ; une erreur levée est transmise au modèle.
const chercherSalles = tool({ name: "chercher_salles", description: "à compléter", parameters: z.object({}), execute: async () => "à implémenter" });
const reserverSalle = tool({ name: "reserver_salle", description: "à compléter", parameters: z.object({}), execute: async () => "à implémenter" });

// --- Deux agents spécialisés, et un agent d'accueil qui passe le relais ---------
const reservation = new Agent({
  name: "Réservation",
  handoffDescription: "Réserve des salles de réunion.",
  instructions: `Tu réserves des salles chez Orion. Nous sommes le ${new Date().toISOString().slice(0, 10)}. Ne prétends jamais avoir réservé sans appel réussi à reserver_salle.`,
  model: config.model,
  tools: [chercherSalles, reserverSalle],
});
const support = new Agent({
  name: "Support",
  handoffDescription: "Répond aux questions sur les produits Orion (caisse, stock, planning…).",
  instructions: "Tu es le support Orion. Réponds brièvement ; si tu ne sais pas, propose d'ouvrir un ticket.",
  model: config.model,
});

// TODO : Écrire un garde-fou d'entrée (inputGuardrails) : un petit agent « Filtre » avec outputType z.object({ hors_sujet: z.boolean(), raison: z.string() }) juge la demande ; le garde-fou déclenche (tripwireTriggered) si hors_sujet. Puis créer l'agent « Accueil » avec handoffs [reservation, support] et ce garde-fou.
const accueil = new Agent({ name: "Accueil", instructions: "à compléter", model: config.model });

const demande = process.argv.slice(2).join(" ") || "Réserve une salle pour 8 personnes demain à 10 h, 1 h, pour la rétro du sprint.";
try {
  const res = await run(accueil, demande, { maxTurns: 8 }); // maxTurns : le MAX_STEPS du TP 4
  console.log(`\nAgent final : ${res.lastAgent?.name}`);
  console.log(`Réponse      : ${res.finalOutput}`);
  console.log(`Étapes       : ${res.newItems.map((i) => i.type.replace(/_item$/, "")).join(" → ")}`);
  console.log("Réservations :", reservations);
} catch (e) {
  if (e instanceof InputGuardrailTripwireTriggered) console.log("⛔ Demande refusée par le garde-fou (hors périmètre).");
  else throw e;
}
if (config.isOpenAI) console.log("Trace de l'exécution : tableau de bord OpenAI › Traces.");
