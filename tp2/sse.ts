// TP 2.1 — Un parseur Server-Sent Events écrit à la main.
//
// Format SSE (texte, UTF-8) :
//   data: {"choices":[...]}\n
//   \n                         ← une ligne vide termine l'événement
//   : keep-alive               ← commentaire (à ignorer) : certains serveurs et proxys en envoient
//   data: [DONE]\n\n           ← convention de Chat Completions : fin du flux
//
// Piège n°1 : un paquet réseau ne correspond PAS à un événement. Un morceau peut
// contenir trois événements, ou la moitié d'un seul. Il faut un tampon.

/** Transforme un flux d'octets en une suite de charges utiles `data:` (chaînes). */
export async function* parseSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const decoder = new TextDecoder(); // { stream: true } gère les caractères UTF-8 coupés en deux
  let buffer = "";

  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    buffer = buffer.replace(/\r\n/g, "\n");

    let fin: number;
    while ((fin = buffer.indexOf("\n\n")) !== -1) {
      const evenement = buffer.slice(0, fin);
      buffer = buffer.slice(fin + 2);

      const data = evenement
        .split("\n")
        .filter((ligne) => ligne.startsWith("data:"))
        .map((ligne) => ligne.slice(5).trim())
        .join("\n");

      if (!data) continue;
      if (data === "[DONE]") return;
      yield data;
    }
  }
}
