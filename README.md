# L'IA comme Outil et Service — kit de TP

Node.js ≥ 22 · TypeScript · API OpenAI (Chat Completions, Responses, Realtime) · SDK `openai`

## Installation

```bash
npm install
cp .env.example .env      # puis collez la clé fournie par l'école dans OPENAI_API_KEY
npm run typecheck         # vérifie que tout compile
npm run models            # les modèles que votre clé peut appeler
```

À savoir avant d'écrire la moindre requête :

- **La clé est un secret, et elle coûte de l'argent** : chaque requête est facturée à l'école.
  Jamais dans le code, jamais dans git, jamais dans le navigateur. Une clé qui fuit se révoque.
- **Limites de débit** : elles dépendent du palier de l'organisation et sont partagées par tous
  ceux qui utilisent la même clé. Les en-têtes `x-ratelimit-*` de chaque réponse indiquent ce qu'il
  reste. Deux 429 à distinguer : `rate_limit_exceeded` (on attend) et `insufficient_quota`
  (crédit épuisé : inutile de réessayer).
- **Données** : par défaut, OpenAI n'entraîne pas ses modèles sur les données envoyées par l'API,
  mais les conserve un temps (détection des abus), et la Responses API stocke les réponses sauf
  `store: false`. Les données des TP sont fictives : gardez cette habitude.

## Travailler sans rien dépenser : le faux serveur

```bash
npm run mock                                # terminal 1 : http://localhost:4010/v1
# dans .env : OPENAI_BASE_URL=http://localhost:4010/v1
MOCK_FAIL_RATE=0.3 npm run mock             # 30 % de pannes 500/503 (TP 3)
MOCK_RPM=3 npm run mock                     # limite basse pour voir le limiteur (TP 3)
MOCK_QUOTA=5 npm run mock                   # crédit épuisé après 5 requêtes (TP 3)
MOCK_STREAM_ERROR_RATE=1 npm run mock       # erreurs en plein flux (TP 2)
```

Il imite les trois API utilisées : Chat Completions (JSON et SSE), Responses (sorties
structurées, appels d'outils, `previous_response_id`) et Realtime (WebSocket, texte seulement).
Ses réponses sont fabriquées : il teste la plomberie, pas la qualité. Commentez
`OPENAI_BASE_URL` pour revenir à la vraie API.

Pour les blocs optionnels, il simule aussi le cache de prompt, la Batch API, la vision, l'audio
et la génération d'images (un pictogramme et un « la » d'une seconde, pas de vraie création).

## Les TP

| Dossier | API | Sujet | Commande |
|---|---|---|---|
| `tp1/` | Chat Completions | Modèles, premier appel : `curl`, `fetch` nu, SDK, chat en ligne de commande | `npm run models`, `bash tp1/01-curl.sh`, `npm run tp1:fetch`, `tp1:sdk`, `tp1:chat` |
| `tp2/` | Chat Completions | Streaming : parseur SSE écrit à la main, premier token, erreur en plein flux | `npm run tp2:stream`, `tp2:sdk` |
| `tp3/` | Chat Completions | Client résilient : limiteur, retries avec backoff, timeout, annulation | `npm run tp3:demo` |
| `tp4/` | **Responses** | Sorties structurées (zod) et boucle d'agent à outils, état côté serveur | `npm run tp4:extract`, `tp4:agent` |
| `tp5/` | **Realtime** | Relais WebSocket navigateur ⇄ serveur ⇄ Realtime API, avec bouton Stop | `npm run tp5` → http://localhost:3000 |
| `projet/` | Chat + Responses | Mini-projet « Le Salon » | `npm run projet` → http://localhost:3000 |

### Blocs optionnels (si le temps le permet)

| Dossier | Bloc | Sujet | Commande |
|---|---|---|---|
| `optA-couts/` | A · Coûts et performance | Cache de prompt (`cached_tokens`), coût par appel, Batch API | `npm run optA:cache`, `optA:batch` |
| `optB-eval/` | B · Évaluer et observer | Banc d'évaluation sur 12 tickets étiquetés, traces JSONL avec `x-request-id` | `npm run optB:eval` |
| `optC-agents/` | C · Agents OpenAI | SDK `@openai/agents` : outils zod, relais entre agents, garde-fou | `npm run optC:agents` |
| `optD-multimodal/` | D · Multimodal | Vision (capture → JSON), synthèse et transcription vocales, génération d'image | `npm run optD:vision`, `optD:voix`, `optD:image` |

Pour les coûts en dollars (bloc A et B), recopiez les prix du jour dans `.env` (`PRIX_*`).
Le bloc D utilise trois modèles de plus (`OPENAI_TTS_MODEL`, `OPENAI_STT_MODEL`, `OPENAI_IMAGE_MODEL`) ;
la génération d'images peut exiger une vérification de l'organisation chez OpenAI.

Les fichiers techniques (`mock/`, `src/config.ts`, les pages `public/index.html`) n'ont pas à être
lus : ils ne portent qu'une ligne d'en-tête. Tout se règle dans `.env`.

Chaque zone à compléter est signalée par un commentaire `// TODO :` qui en donne la consigne.
Le mini-projet réutilise `tp3/llm.ts` : si le vôtre n'est pas terminé, repartez du corrigé
distribué en fin de première séance.
