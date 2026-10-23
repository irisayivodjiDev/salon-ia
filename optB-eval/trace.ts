// OPTIONNEL B — Une trace par appel : ce qu'on regarde quand quelque chose tourne mal en production.
import { appendFileSync } from "node:fs";
import { cout } from "../src/config.js";

export type Trace = {
  at: string; operation: string; model: string; request_id: string | null;
  ms: number; input_tokens: number; cached_tokens: number; output_tokens: number; usd: number; ok: boolean; erreur?: string;
};

const FICHIER = new URL("./traces.jsonl", import.meta.url);

/**
 * Enveloppe un appel du SDK et journalise une ligne JSON par appel.
 * `.withResponse()` du SDK donne accès aux en-têtes HTTP, dont x-request-id (à citer au support).
 */
export async function trace<T extends { model?: string; usage?: any }>(
  operation: string,
  call: () => { withResponse(): Promise<{ data: T; response: Response }> },
): Promise<T> {
  const t0 = performance.now();
  // TODO : Exécuter call().withResponse(), mesurer la durée, puis écrire (appendFileSync) une ligne JSON de type Trace : modèle, x-request-id, tokens d'entrée (dont en cache), de sortie, coût. En cas d'exception, écrire une trace ok: false avec le message, puis relancer l'erreur.
  const { data } = await call().withResponse();
  console.log("trace à implémenter", operation, t0, FICHIER.pathname);
  return data;
}
