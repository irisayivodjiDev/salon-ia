// TP 4.2 — Tool calling avec la Responses API : le modèle ne fait rien, il DEMANDE. Votre code exécute.
//
// La boucle d'agent :
//   1. on envoie la demande + la liste des outils
//   2. la réponse contient soit du texte (fin), soit des éléments « function_call »
//   3. on exécute chaque appel, on renvoie un élément « function_call_output » (même call_id), on recommence
//
// Différence clé avec Chat Completions : l'état peut rester CÔTÉ SERVEUR. Avec previous_response_id,
// on n'envoie que les nouveaux éléments ; OpenAI retrouve le reste (il faut alors store: true).
import { z } from "zod";
import type { FunctionTool, Response as ApiResponse, ResponseInputItem } from "openai/resources/responses/responses";
import { config, openai } from "../src/config.js";

// --- Le « système d'information » fictif --------------------------------
const salles = [
  { id: "S-ATLAS", nom: "Atlas", places: 4, equipement: ["écran"] },
  { id: "S-BOREAL", nom: "Boréal", places: 10, equipement: ["écran", "visio"] },
  { id: "S-CAP", nom: "Cap", places: 16, equipement: ["écran", "visio", "tableau blanc"] },
];
const reservations: { salle_id: string; date: string; debut: string; fin: string; objet: string }[] = [
  { salle_id: "S-BOREAL", date: demain(), debut: "14:00", fin: "15:00", objet: "Point client" },
];

// --- Les outils : un schéma zod pour valider, une fonction pour exécuter -----
const ChercherArgs = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), participants: z.number().int().min(1) });
const ReserverArgs = z.object({
  salle_id: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  debut: z.string().regex(/^\d{2}:\d{2}$/), fin: z.string().regex(/^\d{2}:\d{2}$/), objet: z.string().max(80),
});

const implementations: Record<string, (args: unknown) => unknown> = {
  chercher_salles: (raw) => {
    const { date, participants } = ChercherArgs.parse(raw);
    return salles
      .filter((s) => s.places >= participants)
      .map((s) => ({ ...s, occupee: reservations.filter((r) => r.salle_id === s.id && r.date === date).map((r) => `${r.debut}-${r.fin}`) }));
  },
  reserver_salle: (raw) => {
    const a = ReserverArgs.parse(raw);
    if (!salles.some((s) => s.id === a.salle_id)) return { ok: false, erreur: "salle inconnue" };
    const conflit = reservations.find((r) => r.salle_id === a.salle_id && r.date === a.date && r.debut < a.fin && a.debut < r.fin);
    if (conflit) return { ok: false, erreur: `créneau déjà pris (${conflit.debut}-${conflit.fin})` };
    reservations.push(a);
    return { ok: true, reference: `R-${reservations.length.toString().padStart(4, "0")}` };
  },
};

const tools: FunctionTool[] = [
  {
    type: "function",
    name: "chercher_salles",
    description: "Cherche les salles ayant assez de places à une date donnée. Les créneaux occupés sont indiqués pour chaque salle.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date au format AAAA-MM-JJ." },
        participants: { type: "integer", minimum: 1, description: "Nombre de participants." },
      },
      required: ["date", "participants"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "reserver_salle",
    description: "Réserve une salle pour un créneau précis. Utilise d'abord chercher_salles et vérifie qu'aucun créneau ne chevauche une réservation existante.",
    parameters: {
      type: "object",
      properties: {
        salle_id: { type: "string", description: "Identifiant de la salle trouvée." },
        date: { type: "string", description: "Date au format AAAA-MM-JJ." },
        debut: { type: "string", description: "Heure de début au format HH:MM." },
        fin: { type: "string", description: "Heure de fin au format HH:MM." },
        objet: { type: "string", description: "Motif de la réservation, 80 caractères maximum." },
      },
      required: ["salle_id", "date", "debut", "fin", "objet"],
      additionalProperties: false,
    },
    strict: true,
  },
];

// --- La boucle -----------------------------------------------------------
const client = openai();
const MAX_STEPS = 6; // garde-fou : un agent sans borne peut boucler (et coûter) indéfiniment
const demande = process.argv.slice(2).join(" ") ||
  "Trouve une salle avec visio pour 8 personnes demain après-midi, 1 h, et réserve-la pour la rétro du sprint.";
// Les instructions ne sont PAS reprises par previous_response_id : on les renvoie à chaque appel.
const instructions = `Tu es l'assistant de réservation de salles d'Orion. Nous sommes le ${aujourdhui()}. Utilise les outils ; ne prétends jamais avoir réservé sans appel réussi à reserver_salle.`;

let input: string | ResponseInputItem[] = demande;
let previousResponseId: string | undefined;
let complete = false;

for (let step = 0; step < MAX_STEPS; step++) {
  const response: ApiResponse = await client.responses.create({
    model: config.model,
    instructions,
    input,
    tools,
    previous_response_id: previousResponseId,
    store: true,
  });
  previousResponseId = response.id;

  const calls = response.output.filter((item) => item.type === "function_call");
  if (calls.length === 0) {
    console.log(response.output_text);
    complete = true;
    break;
  }

  input = calls.map((call): ResponseInputItem => {
    try {
      const implementation = implementations[call.name];
      if (!implementation) {
        throw new Error(`Outil inconnu : ${call.name}`);
      }
      const result = implementation(JSON.parse(call.arguments));
      return {
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(result),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify({ ok: false, erreur: message }),
      };
    }
  });
}

if (!complete) {
  throw new Error(`L'agent n'a pas terminé après ${MAX_STEPS} étapes.`);
}

console.log("\nRéservations :", reservations);

function aujourdhui() { return new Date().toISOString().slice(0, 10); }
function demain() { return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10); }
