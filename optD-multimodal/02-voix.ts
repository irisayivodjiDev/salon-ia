// OPTIONNEL D.2 — Audio : du texte vers la voix (synthèse), puis de la voix vers le texte (transcription).
// Deux appels HTTP classiques, sans session ni WebSocket : à comparer avec la Realtime API du TP 5.
//
//   npm run optD:voix -- "Bonjour, la démo client est confirmée jeudi à 10 heures."
import { mkdirSync, writeFileSync, createReadStream } from "node:fs";
import { config, openai } from "../src/config.js";

const client = openai();
const texte = process.argv.slice(2).join(" ") || "Bonjour, la démo client est confirmée jeudi à 10 heures.";
const dossier = new URL("./sortie/", import.meta.url);
mkdirSync(dossier, { recursive: true });
const fichier = new URL("voix.wav", dossier);

// TODO : Synthèse : client.audio.speech.create({ model: config.ttsModel, voice, input, response_format: "wav", instructions }), récupérer les octets (await res.arrayBuffer()) et les écrire dans sortie/voix.wav.
console.log("synthèse à implémenter", texte, config.ttsModel, writeFileSync);

// TODO : Transcription : client.audio.transcriptions.create({ model: config.sttModel, file: createReadStream(fichier), language: "fr" }) et afficher le texte obtenu. Le compare-t-on au texte de départ ?
console.log("transcription à implémenter", config.sttModel, createReadStream, client);
