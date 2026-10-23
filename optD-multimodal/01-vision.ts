// OPTIONNEL D.1 — Vision : envoyer une image au modèle, en recevoir des données structurées.
// Cas : une capture d'écran du Salon (le mini-projet) → qui a parlé, quelles décisions.
//
//   npm run optD:vision                 (ou : npm run optD:vision -- chemin/vers/image.png)
import { readFileSync } from "node:fs";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { config, openai } from "../src/config.js";

const chemin = process.argv[2] ?? new URL("./salon.png", import.meta.url).pathname;
const Capture = z.object({
  participants: z.array(z.string()),
  decisions: z.array(z.string()),
  actions: z.array(z.object({ qui: z.string(), quoi: z.string() })),
});

// TODO : Lire l'image, l'encoder en data URL base64 (data:image/png;base64,…), puis appeler client.responses.parse avec un input de rôle "user" dont le contenu contient un input_text (la question) et un input_image (image_url, detail "low"), et text.format = zodTextFormat(Capture, "capture"). Afficher output_parsed et l'usage.
console.log("à implémenter", chemin, Capture, config.model, readFileSync, zodTextFormat, openai);
