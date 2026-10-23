# TP 5 — Relais vers la Realtime API

Une application web : une page dans le navigateur, un serveur Node au milieu, la Realtime API d'OpenAI au bout.

| Fichier | À quoi il sert | Ce que vous y faites | Lancer |
|---|---|---|---|
| `server.ts` | Serveur Node : sert la page web, accepte le WebSocket du navigateur et ouvre pour chaque onglet une session WebSocket chez OpenAI. Il traduit les messages dans les deux sens. | 6 zones : ouvrir la session, traduire les événements, prompt, cancel, fermeture, battement de cœur | `npm run tp5, puis http://localhost:3000` |
| `public/index.html` | La page du navigateur : saisie, bulles de réponse, bouton Stop. Elle parle à server.ts avec votre protocole (prompt, cancel / start, delta, done). | Rien : fournie complète | ouverte par le navigateur |

**Comment ils s'enchaînent.** navigateur (index.html) ⇄ WebSocket n° 1 ⇄ server.ts ⇄ WebSocket n° 2 ⇄ Realtime API. La clé ne quitte jamais le serveur.

Chaque zone à compléter commence par un commentaire `// TODO :` qui donne la consigne, suivi d'un
`throw` ou d'un code provisoire : remplacez-le, relancez la commande. La fiche du cahier d'exercices
donne les étapes et le résultat attendu ; la diapositive « mode d'emploi » du support les résume.
