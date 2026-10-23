# TP B (optionnel) — Évaluer et observer

Un banc d'évaluation pour l'extraction du TP 4, avec une trace par appel.

| Fichier | À quoi il sert | Ce que vous y faites | Lancer |
|---|---|---|---|
| `reference.json` | Données : 12 tickets fictifs avec la réponse attendue, écrite à la main (dont deux pièges). | Rien : le lire | — |
| `trace.ts` | Module : enveloppe un appel au modèle et écrit une ligne dans traces.jsonl (durée, tokens, coût, x-request-id). | 1 zone : mesurer et écrire la trace | pas lancé seul : utilisé par eval.ts |
| `eval.ts` | Programme : rejoue l'extraction sur les 12 tickets, compare à la référence et affiche les scores. | 1 zone : comparer chaque champ | `npm run optB:eval` |
| `traces.jsonl` | Créé à l'exécution : une ligne JSON par appel. | Le lire | — |

**Comment ils s'enchaînent.** eval.ts lit reference.json, appelle le modèle via trace.ts, qui écrit traces.jsonl.

Chaque zone à compléter commence par un commentaire `// TODO :` qui donne la consigne, suivi d'un
`throw` ou d'un code provisoire : remplacez-le, relancez la commande. La fiche du cahier d'exercices
donne les étapes et le résultat attendu ; la diapositive « mode d'emploi » du support les résume.
