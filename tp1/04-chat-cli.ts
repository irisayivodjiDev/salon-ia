// TP 1.4 — Un chat en ligne de commande. Point clé : l'API est SANS ÉTAT.
// Le modèle ne se souvient de rien : c'est vous qui renvoyez tout l'historique à chaque tour.
import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { config, openai } from "../src/config.js";

type Msg = { role: "system" | "user" | "assistant"; content: string };

const client = openai();
const SYSTEM: Msg = { role: "system", content: "Tu es un assistant pour développeurs. Réponses courtes, en français." };
const MAX_TURNS = 6; // nombre d'échanges conservés : au-delà, on oublie les plus anciens
let history: Msg[] = [];
let totalTokens = 0;

const rl = readline.createInterface({ input: stdin, output: stdout });
console.log("Chat prêt. Commandes : /reset, /historique, /quitter\n");

while (true) {
  const line = (await rl.question("vous > ")).trim();
  if (!line) continue;
  if (line === "/quitter") break;
  if (line === "/reset") { history = []; console.log("(historique effacé)\n"); continue; }
  if (line === "/historique") { console.log(history); continue; }

  history.push({ role: "user", content: line });

  // TODO : Tronquer l'historique aux MAX_TURNS derniers échanges (2 messages par échange), appeler l'API avec [SYSTEM, ...history], ajouter la réponse à l'historique et cumuler les tokens.
  history = history.slice(-2 * MAX_TURNS);
  const messages = [SYSTEM, ...history];

  const response = await client.chat.completions.create({
    model: config.model,
    messages,
  });

  const answer = response.choices[0]?.message.content;
  if (answer === null || answer === undefined) {
    throw new Error("La réponse ne contient pas de texte.");
  }

  history.push({ role: "assistant", content: answer });
  totalTokens += response.usage?.total_tokens ?? 0;
  const messagesSent = messages.length;
console.log(`ia   > ${answer}\n       [${messagesSent} messages envoyés · ${totalTokens} tokens cumulés]\n`);}
rl.close();
