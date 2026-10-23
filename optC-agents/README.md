# TP C (optionnel) — Agents OpenAI

Un seul fichier : l'agent du TP 4, réécrit avec le SDK @openai/agents.

| Fichier | À quoi il sert | Ce que vous y faites | Lancer |
|---|---|---|---|
| `agents.ts` | Les outils (zod), deux agents spécialisés (Réservation, Support), un agent d'accueil qui passe le relais, un garde-fou, et le lancement. | 2 zones : les deux outils, puis le garde-fou et l'agent d'accueil | `npm run optC:agents -- "votre demande"` |

**Comment ils s'enchaînent.** Le SDK fait lui-même la boucle que vous avez écrite au TP 4 : vous ne décrivez que les outils et les agents.

Chaque zone à compléter commence par un commentaire `// TODO :` qui donne la consigne, suivi d'un
`throw` ou d'un code provisoire : remplacez-le, relancez la commande. La fiche du cahier d'exercices
donne les étapes et le résultat attendu ; la diapositive « mode d'emploi » du support les résume.
