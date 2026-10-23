# TP 2 — Le streaming

Un module (sse.ts) et deux programmes qui affichent la réponse au fil de l'eau.

| Fichier | À quoi il sert | Ce que vous y faites | Lancer |
|---|---|---|---|
| `sse.ts` | Module : la fonction parseSSE() transforme le flux d'octets reçu en une suite d'événements « data: ». Réutilisée par le TP 3. | Le cœur du TP : la boucle avec tampon (1 zone) | pas lancé seul : utilisé par stream-fetch.ts |
| `stream-fetch.ts` | Programme : envoie une requête stream: true avec fetch, lit le flux avec votre parseSSE(), écrit le texte au fur et à mesure, mesure le temps du premier mot. | 1 zone : la boucle qui lit les événements | `npm run tp2:stream` |
| `stream-sdk.ts` | Programme : le même flux avec le SDK, qui fait le parsing SSE à votre place. | 1 zone : l'appel stream: true et sa boucle | `npm run tp2:sdk` |

**Comment ils s'enchaînent.** stream-fetch.ts importe parseSSE() depuis sse.ts : écrivez sse.ts d'abord, puis lancez stream-fetch.ts pour le tester.

Chaque zone à compléter commence par un commentaire `// TODO :` qui donne la consigne, suivi d'un
`throw` ou d'un code provisoire : remplacez-le, relancez la commande. La fiche du cahier d'exercices
donne les étapes et le résultat attendu ; la diapositive « mode d'emploi » du support les résume.
