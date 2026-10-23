// TP 5 — Relais vers la Realtime API d'OpenAI :
//   navigateur ⇄ (WebSocket n° 1, votre protocole) ⇄ votre serveur ⇄ (WebSocket n° 2, protocole OpenAI) ⇄ Realtime API
//
// Pourquoi un serveur au milieu ?
//   • la clé API ne doit JAMAIS arriver dans le navigateur ;
//   • c'est ici qu'on applique quotas, journalisation, filtrage, et qu'on traduit les protocoles ;
//   • les deux liaisons sont bidirectionnelles : on peut ANNULER une réponse pendant qu'elle s'écrit.
//
// Différence avec Chat Completions : la Realtime API est une SESSION. La conversation vit côté
// OpenAI tant que le WebSocket est ouvert ; on n'envoie que les nouveaux messages.
//
//   npm run tp5   puis ouvrir http://localhost:3000
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { config, requireKey } from "../src/config.js";

requireKey();

const PORT = Number(process.env.PORT ?? 3000);

// Protocole n° 1, entre le navigateur et nous : c'est VOUS qui le définissez.
const ClientMsg = z.discriminatedUnion("type", [
  z.object({ type: z.literal("prompt"), text: z.string().min(1).max(2000) }),
  z.object({ type: z.literal("cancel") }),
]);
type ServerMsg =
  | { type: "start"; id: string }
  | { type: "delta"; id: string; text: string }
  | { type: "done"; id: string; ms: number; tokens?: number; cancelled?: boolean }
  | { type: "error"; message: string };

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

const http = createServer(async (req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(await readFile(new URL("./public/index.html", import.meta.url)));
  } else {
    res.writeHead(404).end();
  }
});

const wss = new WebSocketServer({ server: http, path: "/ws" });

wss.on("connection", (browser: WebSocket & { alive?: boolean }) => {
  console.log("+ navigateur connecté");
  const toBrowser = (m: ServerMsg) => browser.readyState === WebSocket.OPEN && browser.send(JSON.stringify(m));
  let busy = false;
  let t0 = 0;
  browser.alive = true;
  browser.on("pong", () => (browser.alive = true));

  // Protocole n° 2 : une session Realtime par navigateur. La clé part dans l'en-tête, côté serveur.
  const pendingEvents: object[] = [];
  const openaiWs = new WebSocket(
    `${config.realtimeURL}?model=${encodeURIComponent(config.realtimeModel)}`,
    { headers: { Authorization: `Bearer ${config.apiKey}` } },
  );
  const toOpenAI = (event: object) => {
    if (openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.send(JSON.stringify(event));
    } else if (openaiWs.readyState === WebSocket.CONNECTING) {
      pendingEvents.push(event);
    }
  };
  openaiWs.on("open", () => {
    toOpenAI({
      type: "session.update",
      session: {
        type: "realtime",
        output_modalities: ["text"],
        instructions: "Tu es un assistant utile. Réponds en français, clairement et brièvement.",
      },
    });
    for (const event of pendingEvents.splice(0)) toOpenAI(event);
  });
  openaiWs.on("error", (e) => {
    busy = false;
    toBrowser({ type: "error", message: `Realtime : ${e.message}` });
  });
  openaiWs.on("close", () => browser.close(1011, "session temps réel fermée"));
  let activeId = "";

  // Événements serveur de la Realtime API → messages de NOTRE protocole.
  openaiWs.on("message", (raw) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      return toBrowser({ type: "error", message: "Événement Realtime invalide." });
    }
    const event = asRecord(parsed);
    if (!event || typeof event.type !== "string") {
      return toBrowser({ type: "error", message: "Événement Realtime invalide." });
    }
    if (event.type !== "response.output_text.delta") console.log("  OpenAI     →", event.type); // journal (les deltas sont trop nombreux)
    if (event.type === "response.created") {
      const response = asRecord(event.response);
      if (!response || typeof response.id !== "string") return;
      activeId = response.id;
      return toBrowser({ type: "start", id: activeId });
    }
    if (event.type === "response.output_text.delta") {
      if (typeof event.delta !== "string") return;
      return toBrowser({
        type: "delta",
        id: typeof event.response_id === "string" ? event.response_id : activeId,
        text: event.delta,
      });
    }
    if (event.type === "response.done") {
      const response = asRecord(event.response);
      if (!response) return;
      const usage = asRecord(response.usage);
      const message: ServerMsg = {
        type: "done",
        id: typeof response.id === "string" ? response.id : activeId,
        ms: Date.now() - t0,
        ...(typeof usage?.total_tokens === "number" ? { tokens: usage.total_tokens } : {}),
        cancelled: response.status === "cancelled",
      };
      busy = false;
      activeId = "";
      return toBrowser(message);
    }
    if (event.type === "error") {
      busy = false;
      const error = asRecord(event.error);
      return toBrowser({
        type: "error",
        message: typeof error?.message === "string" ? error.message : "Erreur Realtime.",
      });
    }
  });

  browser.on("message", (raw) => {
    // 1. Ne jamais faire confiance au client : on valide chaque trame.
    let msg: z.infer<typeof ClientMsg>;
    try {
      msg = ClientMsg.parse(JSON.parse(raw.toString()));
    } catch {
      return toBrowser({ type: "error", message: "message invalide" });
    }
    console.log("  navigateur →", msg.type === "prompt" ? `prompt « ${msg.text} »` : msg.type);

    if (msg.type === "cancel") {
      if (busy) toOpenAI({ type: "response.cancel" });
      return;
    }

    if (busy) return toBrowser({ type: "error", message: "une réponse est déjà en cours" });

    t0 = Date.now();
    busy = true;
    toOpenAI({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: msg.text }],
      },
    });
    toOpenAI({ type: "response.create" });
  });

  browser.on("close", () => {
    if (openaiWs.readyState === WebSocket.OPEN || openaiWs.readyState === WebSocket.CONNECTING) {
      openaiWs.close();
    }
  });
});

const heartbeat = setInterval(() => {
  for (const client of wss.clients) {
    const browser = client as WebSocket & { alive?: boolean };
    if (browser.alive === false) {
      browser.terminate();
      continue;
    }
    browser.alive = false;
    browser.ping();
  }
}, 30_000);
heartbeat.unref();

http.listen(PORT, () => {
  console.log(`TP 5 prêt. Ouvrez http://localhost:${PORT} dans votre navigateur et posez votre question dans la page.`);
  console.log(`(Ce terminal n'accepte pas de saisie : il affiche le journal des échanges. Modèle temps réel : ${config.realtimeModel},`);
  console.log(` serveur : ${config.isOpenAI ? "API OpenAI" : config.baseURL}. Ctrl+C pour arrêter.)`);
});
