# TP A (optionnel) — Coûts et performance

Deux programmes qui mesurent ce que coûte un appel et comment payer moins.

| Fichier | À quoi il sert | Ce que vous y faites | Lancer |
|---|---|---|---|
| `charte.ts` | Données : un long texte fixe (environ 2 000 tokens) utilisé comme consigne système, assez long pour activer le cache. | Rien | — |
| `01-cache.ts` | Six appels avec la même charte : compare les tokens en cache et le coût selon l'ordre du prompt. | 1 zone : l'appel et l'affichage de l'usage | `npm run optA:cache` |
| `02-batch.ts` | Envoie six tickets en un seul lot à la Batch API (moitié prix, résultat différé) et récupère les réponses. | 2 zones : créer le lot, puis le suivre et lire les résultats | `npm run optA:batch` |

**Comment ils s'enchaînent.** 01-cache.ts importe la charte ; 02-batch.ts est indépendant. Les prix se règlent dans .env (PRIX_*).

Chaque zone à compléter commence par un commentaire `// TODO :` qui donne la consigne, suivi d'un
`throw` ou d'un code provisoire : remplacez-le, relancez la commande. La fiche du cahier d'exercices
donne les étapes et le résultat attendu ; la diapositive « mode d'emploi » du support les résume.
