# TP D (optionnel) — Multimodal

Trois petits programmes indépendants : lire une image, parler et écouter, dessiner.

| Fichier | À quoi il sert | Ce que vous y faites | Lancer |
|---|---|---|---|
| `salon.png` | Image fournie : une capture d'écran du Salon. | Rien | — |
| `01-vision.ts` | Envoie la capture au modèle et reçoit un objet JSON (participants, décisions). | 1 zone : encoder l'image et l'appel responses.parse | `npm run optD:vision` |
| `02-voix.ts` | Transforme un texte en fichier audio (synthèse), puis ce fichier en texte (transcription). | 2 zones : la synthèse, la transcription | `npm run optD:voix` |
| `03-image.ts` | Génère une image (l'avatar de « ia ») et l'enregistre. | 1 zone : l'appel images.generate | `npm run optD:image` |
| `sortie/` | Créé à l'exécution : voix.wav et avatar-ia.png. | Ouvrir les fichiers produits | — |

**Comment ils s'enchaînent.** Les trois programmes sont indépendants ; ils ont besoin des modèles OPENAI_TTS_MODEL, OPENAI_STT_MODEL et OPENAI_IMAGE_MODEL dans .env.

Chaque zone à compléter commence par un commentaire `// TODO :` qui donne la consigne, suivi d'un
`throw` ou d'un code provisoire : remplacez-le, relancez la commande. La fiche du cahier d'exercices
donne les étapes et le résultat attendu ; la diapositive « mode d'emploi » du support les résume.
