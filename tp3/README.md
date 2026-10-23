# TP 3 — Le client résilient

Un module que vous écrivez (llm.ts) et un banc d'essai fourni (demo.ts) qui le met à l'épreuve.

| Fichier | À quoi il sert | Ce que vous y faites | Lancer |
|---|---|---|---|
| `llm.ts` | Module : chat() et chatStream() pour appeler le modèle, protégés par un limiteur (RateLimiter), des nouvelles tentatives (withRetry) et un délai maximal (post). Réutilisé par le mini-projet. | 3 zones : RateLimiter.schedule, withRetry, post | pas lancé seul : utilisé par demo.ts et le mini-projet |
| `demo.ts` | Banc d'essai : lance cinq requêtes en même temps puis une requête annulée, et affiche la file, les erreurs et les nouvelles tentatives. | Rien : le lancer avec le faux serveur réglé pour tomber en panne | `MOCK_FAIL_RATE=0.4 npm run mock, puis npm run tp3:demo` |

**Comment ils s'enchaînent.** demo.ts appelle chat() de llm.ts, qui utilise parseSSE() du TP 2 pour chatStream(). Le mini-projet réutilisera llm.ts tel quel.

Chaque zone à compléter commence par un commentaire `// TODO :` qui donne la consigne, suivi d'un
`throw` ou d'un code provisoire : remplacez-le, relancez la commande. La fiche du cahier d'exercices
donne les étapes et le résultat attendu ; la diapositive « mode d'emploi » du support les résume.
