# TP 4 — Extraire, puis agir

Deux programmes indépendants, tous deux avec la Responses API.

| Fichier | À quoi il sert | Ce que vous y faites | Lancer |
|---|---|---|---|
| `extract.ts` | Trie trois tickets de support : le modèle renvoie un objet JSON conforme à un schéma zod, que le code revalide. | 2 zones : le schéma Ticket, l'appel responses.parse | `npm run tp4:extract` |
| `agent.ts` | Un agent qui réserve une salle de réunion : le modèle demande des outils, votre code les exécute et lui renvoie les résultats. Les salles et les fonctions métier sont fournies. | 2 zones : décrire les deux outils, écrire la boucle d'agent | `npm run tp4:agent -- "votre demande"` |

**Comment ils s'enchaînent.** Faites extract.ts d'abord (un seul appel), puis agent.ts (plusieurs appels en boucle).

Chaque zone à compléter commence par un commentaire `// TODO :` qui donne la consigne, suivi d'un
`throw` ou d'un code provisoire : remplacez-le, relancez la commande. La fiche du cahier d'exercices
donne les étapes et le résultat attendu ; la diapositive « mode d'emploi » du support les résume.
