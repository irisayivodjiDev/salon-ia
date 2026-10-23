# TP 1 — Premier appel

Cinq petits programmes indépendants, du plus brut au plus confortable : la même question posée au modèle de quatre façons.

| Fichier | À quoi il sert | Ce que vous y faites | Lancer |
|---|---|---|---|
| `00-models.ts` | Demande à l'API la liste des modèles que votre clé peut appeler (GET /models). | 1 zone : l'appel fetch en GET et l'affichage des identifiants | `npm run models` |
| `01-curl.sh` | Script shell : le même appel en curl, sans code, pour voir la requête et la réponse brutes (JSON, en-têtes, flux). | Rien à écrire : le lancer et lire la sortie | `bash tp1/01-curl.sh` |
| `02-fetch.ts` | L'appel Chat Completions écrit à la main avec fetch : URL, en-têtes, corps JSON, lecture de la réponse. | 3 zones : envoyer le POST, gérer une erreur HTTP, afficher la réponse | `npm run tp1:fetch` |
| `03-sdk.ts` | Le même appel avec le SDK officiel openai : quelques lignes au lieu de trente. | 1 zone : client.chat.completions.create | `npm run tp1:sdk` |
| `04-chat-cli.ts` | Un chat dans le terminal. L'API ne se souvient de rien : ce programme garde l'historique et le renvoie à chaque tour. | 1 zone : tronquer l'historique, appeler l'API, ajouter la réponse | `npm run tp1:chat` |

**Comment ils s'enchaînent.** Les fichiers ne dépendent pas les uns des autres : faites-les dans l'ordre, chacun montre ce que le précédent cachait.

Chaque zone à compléter commence par un commentaire `// TODO :` qui donne la consigne, suivi d'un
`throw` ou d'un code provisoire : remplacez-le, relancez la commande. La fiche du cahier d'exercices
donne les étapes et le résultat attendu ; la diapositive « mode d'emploi » du support les résume.
