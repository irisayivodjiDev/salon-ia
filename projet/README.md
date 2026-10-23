# Mini-projet — Le Salon

Un salon de discussion déjà fonctionnel, auquel vous ajoutez un participant « ia ».

| Fichier | À quoi il sert | Ce que vous y faites | Lancer |
|---|---|---|---|
| `server.ts` | Le serveur du salon : pseudo, messages, présence et diffusion à tous sont déjà écrits. C'est ici que vit l'IA. | 6 zones, par niveaux : contexte, file, pump, answer, /stop, /resume | `npm run projet, puis http://localhost:3000 dans deux onglets` |
| `public/index.html` | La page du salon, complète : elle affiche déjà les messages de l'IA (ia_start, ia_delta, ia_done), la file d'attente et la synthèse. | Rien : fournie complète | ouverte par le navigateur |
| `../tp3/llm.ts` | Votre client du TP 3 (ou son corrigé) : chatStream() pour la réponse en flux, limiter pour partager le débit de la clé. | Rien de plus : il doit simplement fonctionner | — |

**Comment ils s'enchaînent.** Un message « @ia » arrive dans server.ts → mis en file → answer() appelle chatStream() de llm.ts → chaque morceau est diffusé à tous les onglets.

Chaque zone à compléter commence par un commentaire `// TODO :` qui donne la consigne, suivi d'un
`throw` ou d'un code provisoire : remplacez-le, relancez la commande. La fiche du cahier d'exercices
donne les étapes et le résultat attendu ; la diapositive « mode d'emploi » du support les résume.
