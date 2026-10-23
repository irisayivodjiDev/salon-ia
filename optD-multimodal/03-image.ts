// OPTIONNEL D.3 — Générer une image par API : un avatar pour « ia », le participant du Salon.
// Deux voies : l'API Images (un appel, une image) ou l'outil image_generation de la Responses API
// (dans une conversation, retouches successives). Ici, l'API Images.
//
//   npm run optD:image -- "un petit robot orange et bienveillant, style pictogramme plat, fond uni"
import { mkdirSync, writeFileSync } from "node:fs";
import { config, openai } from "../src/config.js";

const prompt = process.argv.slice(2).join(" ") || "Un petit robot orange et bienveillant, style pictogramme plat, fond bleu nuit uni, sans texte.";
const dossier = new URL("./sortie/", import.meta.url);
mkdirSync(dossier, { recursive: true });

// TODO : Appeler client.images.generate({ model: config.imageModel, prompt, size: "1024x1024", quality: "low" }), décoder data[0].b64_json (Buffer.from(…, "base64")) et l'écrire dans sortie/avatar-ia.png. Afficher l'usage s'il est présent.
console.log("à implémenter", prompt, config.imageModel, writeFileSync, openai);
