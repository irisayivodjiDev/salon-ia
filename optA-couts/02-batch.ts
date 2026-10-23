// OPTIONNEL A.2 — La Batch API : moitié prix, en échange d'un résultat différé (jusqu'à 24 h).
// Idéal pour les traitements de masse qui n'attendent personne : classer les tickets de la nuit.
//
//   npm run optA:batch                 → crée un lot et suit son avancement
//   npm run optA:batch -- batch_xxx    → reprend le suivi d'un lot déjà créé (un vrai lot peut prendre des heures)
import { toFile } from "openai";
import { config, openai } from "../src/config.js";

const client = openai();
const tickets = [
  "Plus personne ne peut encaisser sur Orion Caisse depuis 8 h.",
  "Export CSV des rapports d'Orion Stock ?",
  "Facture d'octobre payée deux fois.",
  "Mot de passe oublié, le lien de réinitialisation n'arrive pas.",
  "Le planning de la semaine prochaine ne s'affiche plus sur Orion Planning.",
  "Pourriez-vous ajouter un mode sombre ?",
];

let batchId = process.argv[2];

if (!batchId) {
  // TODO : Construire le fichier JSONL : une ligne par ticket, { custom_id, method: "POST", url: "/v1/chat/completions", body: { model, max_tokens, messages } }. Le téléverser avec client.files.create({ file: await toFile(Buffer.from(jsonl), "lot.jsonl"), purpose: "batch" }), puis créer le lot avec client.batches.create({ input_file_id, endpoint: "/v1/chat/completions", completion_window: "24h" }).
  throw new Error("À implémenter : création du fichier JSONL et du lot");
  console.log(`Lot créé : ${batchId} (${tickets.length} requêtes). Suivi :`);
}

// TODO : Interroger client.batches.retrieve(batchId) toutes les 2 s (30 fois au plus) jusqu'au statut "completed". Puis télécharger le fichier de résultats (client.files.content(output_file_id), .text()), et afficher pour chaque ligne le custom_id et la réponse. Attention : l'ordre des lignes n'est pas garanti.
console.log("à implémenter : suivi du lot", batchId);
