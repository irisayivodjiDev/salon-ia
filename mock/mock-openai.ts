// Faux serveur OpenAI des TP : se lance avec « npm run mock ». Rien à lire ni à modifier ici.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID, createHash } from "node:crypto";
import { deflateSync, crc32 } from "node:zlib";
import { WebSocketServer, WebSocket } from "ws";

try { process.loadEnvFile(); } catch { }
const PORT = Number(process.env.MOCK_PORT ?? 4010);
const FAIL_RATE = Number(process.env.MOCK_FAIL_RATE ?? 0);
const RPM = Number(process.env.MOCK_RPM ?? 60);
const QUOTA = Number(process.env.MOCK_QUOTA ?? Infinity);
const STREAM_ERROR_RATE = Number(process.env.MOCK_STREAM_ERROR_RATE ?? 0);
const FIRST_TOKEN_MS = 450;
const TOKEN_MS = 35;
const EXPECTED_KEY = process.env.OPENAI_API_KEY;

type Json = Record<string, any>;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const now = () => Math.floor(Date.now() / 1000);
const approxTokens = (s: string) => Math.max(1, Math.ceil(s.length / 4));
const rid = (prefix: string) => prefix + randomUUID().replace(/-/g, "").slice(0, 24);

const hits = new Map<string, number[]>();
const total = new Map<string, number>();
function limited(key: string): "rate" | "quota" | null {
  const t = Date.now();
  const n = (total.get(key) ?? 0) + 1;
  total.set(key, n);
  if (n > QUOTA) return "quota";
  const recent = (hits.get(key) ?? []).filter((x) => t - x < 60_000);
  recent.push(t);
  hits.set(key, recent);
  return recent.length > RPM ? "rate" : null;
}

const seenPrefixes = new Set<string>();
function cachedTokens(text: string): number {
  const total = approxTokens(text);
  let cached = 0;
  for (let t = 1024; t <= total; t += 128) {
    const h = createHash("sha1").update(text.slice(0, t * 4)).digest("hex");
    if (seenPrefixes.has(h)) cached = t;
    seenPrefixes.add(h);
  }
  return cached;
}

function png(w = 64, h = 64, rgb: [number, number, number] = [232, 112, 42]): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = y * (w * 3 + 1) + 1 + x * 3;
    const ring = Math.hypot(x - w / 2, y - h / 2) < w / 3;
    raw[o] = ring ? rgb[0] : 27; raw[o + 1] = ring ? rgb[1] : 31; raw[o + 2] = ring ? rgb[2] : 42;
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
function wav(seconds = 1.2, freq = 440): Buffer {
  const rate = 16000, n = Math.floor(rate * seconds);
  const b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8); b.write("fmt ", 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin((2 * Math.PI * freq * i) / rate) * 8000), 44 + i * 2);
  return b;
}

function fromSchema(schema: any, name = "valeur"): any {
  if (!schema || typeof schema !== "object") return null;
  if (schema.enum) return schema.enum[0];
  if (schema.anyOf) return fromSchema(schema.anyOf.find((s: any) => s.type !== "null") ?? schema.anyOf[0], name);
  const type = Array.isArray(schema.type) ? schema.type.find((t: string) => t !== "null") : schema.type;
  switch (type) {
    case "object": {
      const out: Json = {};
      for (const [k, v] of Object.entries(schema.properties ?? {})) out[k] = fromSchema(v, k);
      return out;
    }
    case "array": return [fromSchema(schema.items, name)];
    case "integer": case "number": return schema.minimum ?? 1;
    case "boolean": return false;
    case "string":
      if (schema.format === "date" || /AAAA-MM-JJ|YYYY-MM-DD/.test(schema.description ?? "")) return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
      if (/HH:MM/.test(schema.description ?? "")) return name === "fin" ? "11:00" : "10:00";
      return `exemple_${name}`;
    default: return null;
  }
}

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((c: any) => c.text ?? "").join("");
  return "";
}
const simulated = (q: string) =>
  `[réponse simulée] Vous avez écrit : « ${q.slice(0, 120)} ». Ce texte est produit par le faux serveur local : ` +
  "il sert à vérifier que votre code envoie la requête, lit le flux et gère les erreurs, sans rien dépenser.";

function fail(res: ServerResponse, status: number, message: string, type: string, code: string | null, headers: Json = {}) {
  send(res, status, { error: { message, type, param: null, code } }, headers);
}
function send(res: ServerResponse, status: number, payload: Json, headers: Json = {}) {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(payload));
}
async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}
function authOk(auth: string | undefined): string | null {
  const a = auth ?? "";
  if (!a.startsWith("Bearer ") || a.length < 8 || (EXPECTED_KEY && a !== `Bearer ${EXPECTED_KEY}`)) return null;
  return a;
}

async function guard(req: IncomingMessage, res: ServerResponse): Promise<Json | null> {
  const auth = authOk(req.headers.authorization);
  if (!auth) { fail(res, 401, "Incorrect API key provided.", "invalid_request_error", "invalid_api_key"); return null; }
  const lim = limited(auth);
  const rl = { "x-ratelimit-limit-requests": String(RPM), "x-ratelimit-remaining-requests": String(Math.max(0, RPM - (hits.get(auth)?.length ?? 0))) };
  if (lim === "quota") { fail(res, 429, "You exceeded your current quota, please check your plan and billing details.", "insufficient_quota", "insufficient_quota"); return null; }
  if (lim === "rate") { fail(res, 429, `Rate limit reached for requests. Limit ${RPM} / min.`, "requests", "rate_limit_exceeded", { ...rl, "retry-after": "2" }); return null; }
  if (Math.random() < FAIL_RATE) {
    Math.random() < 0.5 ? fail(res, 500, "The server had an error while processing your request (simulé).", "server_error", null) : fail(res, 503, "The engine is currently overloaded (simulé).", "server_error", null);
    return null;
  }
  try {
    const body = JSON.parse(await readBody(req));
    for (const [k, v] of Object.entries(rl)) res.setHeader(k, v);
    return body;
  } catch {
    fail(res, 400, "We could not parse the JSON body of your request.", "invalid_request_error", null);
    return null;
  }
}

function sseStart(res: ServerResponse) {
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
  const state = { aborted: false };
  res.on("close", () => (state.aborted = true));
  return state;
}

async function chatCompletions(req: IncomingMessage, res: ServerResponse) {
  const body = await guard(req, res);
  if (!body) return;
  if (!body.model) return fail(res, 400, "you must provide a model parameter", "invalid_request_error", "missing_required_parameter");
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return fail(res, 400, "Missing required parameter: 'messages'.", "invalid_request_error", "missing_required_parameter");
  }
  const last = body.messages.at(-1) ?? {};
  let content = "";
  let toolCalls: Json[] | undefined;
  if (body.tools?.length && last.role !== "tool" && body.tool_choice !== "none") {
    const f = body.tools[0].function;
    toolCalls = [{ id: rid("call_"), type: "function", function: { name: f.name, arguments: JSON.stringify(fromSchema(f.parameters)) } }];
  } else if (last.role === "tool") content = `D'après l'outil, voici le résultat : ${textOf(last.content).slice(0, 200)}`;
  else if (body.response_format?.type === "json_schema") content = JSON.stringify(fromSchema(body.response_format.json_schema?.schema));
  else content = simulated(textOf(last.content));

  const id = rid("chatcmpl-");
  const promptText = JSON.stringify(body.messages);
  const pt = approxTokens(promptText), ct = approxTokens(content || JSON.stringify(toolCalls));
  const usage = { prompt_tokens: pt, completion_tokens: ct, total_tokens: pt + ct, prompt_tokens_details: { cached_tokens: cachedTokens(promptText) }, completion_tokens_details: { reasoning_tokens: 0 } };
  const finish = toolCalls ? "tool_calls" : "stop";
  const base = { id, model: body.model, created: now(), system_fingerprint: "fp_mock" };

  if (!body.stream) {
    await sleep(FIRST_TOKEN_MS + ct * 5);
    return send(res, 200, { ...base, object: "chat.completion", usage, choices: [{ index: 0, finish_reason: finish, logprobs: null, message: { role: "assistant", content: toolCalls ? null : content, refusal: null, ...(toolCalls ? { tool_calls: toolCalls } : {}) } }] });
  }
  const st = sseStart(res);
  const chunk = (delta: Json, finish_reason: string | null = null) =>
    `data: ${JSON.stringify({ ...base, object: "chat.completion.chunk", choices: [{ index: 0, delta, logprobs: null, finish_reason }] })}\n\n`;
  await sleep(FIRST_TOKEN_MS);
  res.write(chunk({ role: "assistant", content: "", refusal: null }));
  if (toolCalls) res.write(chunk({ tool_calls: toolCalls.map((t, index) => ({ index, ...t })) }));
  else {
    const pieces = content.match(/\S+\s*/g) ?? [];
    const breakAt = Math.random() < STREAM_ERROR_RATE ? Math.floor(pieces.length / 2) : -1;
    for (let i = 0; i < pieces.length; i++) {
      if (st.aborted) return console.log("  ↳ client déconnecté, flux interrompu");
      if (i === breakAt) {
        res.write(`data: ${JSON.stringify({ error: { message: "The server had an error while processing your request (simulé).", type: "server_error", param: null, code: null } })}\n\n`);
        return res.end();
      }
      res.write(chunk({ content: pieces[i] }));
      await sleep(TOKEN_MS);
    }
  }
  res.write(chunk({}, finish));
  if (body.stream_options?.include_usage) res.write(`data: ${JSON.stringify({ ...base, object: "chat.completion.chunk", choices: [], usage })}\n\n`);
  res.end("data: [DONE]\n\n");
}

const stored = new Map<string, Json[]>();
function inputItems(input: unknown): Json[] {
  if (typeof input === "string") return [{ role: "user", content: input }];
  return Array.isArray(input) ? input : [];
}
async function responses(req: IncomingMessage, res: ServerResponse) {
  const body = await guard(req, res);
  if (!body) return;
  if (!body.model) return fail(res, 400, "you must provide a model parameter", "invalid_request_error", "missing_required_parameter");
  if (body.input == null) return fail(res, 400, "Missing required parameter: 'input'.", "invalid_request_error", "missing_required_parameter");
  if (body.previous_response_id && !stored.has(body.previous_response_id)) {
    return fail(res, 400, `Previous response with id '${body.previous_response_id}' not found.`, "invalid_request_error", "previous_response_not_found");
  }
  const items = [...(stored.get(body.previous_response_id) ?? []), ...inputItems(body.input)];
  if (body.instructions) items.unshift({ role: "developer", content: body.instructions });
  const last = items.at(-1) ?? {};
  const id = rid("resp_");
  const images = Array.isArray(last.content) ? last.content.filter((c: Json) => c.type === "input_image").length : 0;
  const fn = (body.tools ?? []).find((t: Json) => t.type === "function");
  const hosted = (body.tools ?? []).filter((t: Json) => t.type !== "function").map((t: Json) => t.type);
  let output: Json[];
  if (hosted.includes("image_generation") && !fn) {
    output = [
      { type: "image_generation_call", id: rid("ig_"), status: "completed", result: png().toString("base64") },
      { type: "message", id: rid("msg_"), status: "completed", role: "assistant", content: [{ type: "output_text", text: "[réponse simulée] Voici l'image demandée.", annotations: [], logprobs: [] }] },
    ];
  } else if (hosted.length && !fn) {
    const text = `[réponse simulée] Outils hébergés demandés : ${hosted.join(", ")}. Le faux serveur ne les exécute pas ; essayez sur la vraie API.`;
    output = [{ type: "message", id: rid("msg_"), status: "completed", role: "assistant", content: [{ type: "output_text", text, annotations: [], logprobs: [] }] }];
  } else if (fn && last.type !== "function_call_output" && body.tool_choice !== "none") {
    const f = fn;
    output = [{ type: "function_call", id: rid("fc_"), call_id: rid("call_"), name: f.name, arguments: JSON.stringify(fromSchema(f.parameters)), status: "completed" }];
  } else {
    const text = last.type === "function_call_output"
      ? `D'après l'outil, voici le résultat : ${String(last.output).slice(0, 200)}`
      : body.text?.format?.type === "json_schema" ? JSON.stringify(fromSchema(body.text.format.schema))
      : images ? `[réponse simulée] ${images} image(s) reçue(s) avec la question « ${textOf(last.content).slice(0, 80)} ».`
      : simulated(textOf(last.content));
    output = [{ type: "message", id: rid("msg_"), status: "completed", role: "assistant", content: [{ type: "output_text", text, annotations: [], logprobs: [] }] }];
  }
  if (body.store !== false) stored.set(id, [...items, ...output]);
  const inputText = JSON.stringify(items).replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/g, "[image]");
  const it = approxTokens(inputText) + images * 85, ot = approxTokens(JSON.stringify(output.filter((o) => o.type !== "image_generation_call")));
  const response = {
    id, object: "response", created_at: now(), status: "completed", model: body.model, output,
    instructions: body.instructions ?? null, previous_response_id: body.previous_response_id ?? null,
    tools: body.tools ?? [], text: body.text ?? { format: { type: "text" } }, store: body.store !== false,
    parallel_tool_calls: true, tool_choice: body.tool_choice ?? "auto", temperature: body.temperature ?? 1, top_p: 1,
    error: null, incomplete_details: null, metadata: {},
    usage: { input_tokens: it, output_tokens: ot, total_tokens: it + ot, input_tokens_details: { cached_tokens: cachedTokens(inputText) }, output_tokens_details: { reasoning_tokens: 0 } },
  };
  if (!body.stream) { await sleep(FIRST_TOKEN_MS + ot * 5); return send(res, 200, response); }

  const st = sseStart(res);
  let seq = 0;
  const ev = (type: string, data: Json) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, sequence_number: seq++, ...data })}\n\n`);
  ev("response.created", { response: { ...response, status: "in_progress", output: [], usage: null } });
  await sleep(FIRST_TOKEN_MS);
  const msg = output[0];
  if (msg.type === "message") {
    for (const piece of msg.content[0].text.match(/\S+\s*/g) ?? []) {
      if (st.aborted) return console.log("  ↳ client déconnecté, flux interrompu");
      ev("response.output_text.delta", { item_id: msg.id, output_index: 0, content_index: 0, delta: piece, logprobs: [] });
      await sleep(TOKEN_MS);
    }
  }
  ev("response.completed", { response });
  res.end();
}

async function speech(req: IncomingMessage, res: ServerResponse) {
  const body = await guard(req, res);
  if (!body) return;
  if (!body.input || !body.voice) return fail(res, 400, "Missing required parameter: 'input' or 'voice'.", "invalid_request_error", "missing_required_parameter");
  res.writeHead(200, { "content-type": "audio/wav" });
  res.end(wav());
}
async function transcriptions(req: IncomingMessage, res: ServerResponse) {
  const auth = authOk(req.headers.authorization);
  if (!auth) return fail(res, 401, "Incorrect API key provided.", "invalid_request_error", "invalid_api_key");
  const raw = await readBody(req);
  send(res, 200, { text: `[transcription simulée] fichier audio reçu (${Math.round(raw.length / 1024)} Ko).`, usage: { type: "duration", seconds: 1 } });
}
async function imagesGenerate(req: IncomingMessage, res: ServerResponse) {
  const body = await guard(req, res);
  if (!body) return;
  if (!body.prompt) return fail(res, 400, "Missing required parameter: 'prompt'.", "invalid_request_error", "missing_required_parameter");
  await sleep(800);
  const n = body.n ?? 1;
  send(res, 200, {
    created: now(), data: Array.from({ length: n }, () => ({ b64_json: png(256, 256).toString("base64") })),
    usage: { input_tokens: approxTokens(body.prompt), output_tokens: 272, total_tokens: approxTokens(body.prompt) + 272 },
  });
}

const files = new Map<string, { content: string; filename: string; purpose: string }>();
const batches = new Map<string, Json>();
function multipartFile(raw: Buffer, contentType: string): { filename: string; content: string; fields: Json } {
  const boundary = /boundary=(.+)$/.exec(contentType)?.[1]?.replace(/"/g, "") ?? "";
  const parts = raw.toString("latin1").split(`--${boundary}`);
  const out = { filename: "fichier", content: "", fields: {} as Json };
  for (const part of parts) {
    const [head, ...rest] = part.split("\r\n\r\n");
    const body = rest.join("\r\n\r\n").replace(/\r\n$/, "");
    const name = /name="([^"]+)"/.exec(head)?.[1];
    const fname = /filename="([^"]+)"/.exec(head)?.[1];
    if (fname) { out.filename = fname; out.content = Buffer.from(body, "latin1").toString("utf8"); }
    else if (name) out.fields[name] = body;
  }
  return out;
}
async function filesUpload(req: IncomingMessage, res: ServerResponse) {
  if (!authOk(req.headers.authorization)) return fail(res, 401, "Incorrect API key provided.", "invalid_request_error", "invalid_api_key");
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const { filename, content, fields } = multipartFile(Buffer.concat(chunks), req.headers["content-type"] ?? "");
  const id = rid("file-");
  files.set(id, { content, filename, purpose: fields.purpose ?? "batch" });
  send(res, 200, { id, object: "file", bytes: Buffer.byteLength(content), created_at: now(), filename, purpose: fields.purpose ?? "batch", status: "processed" });
}
function batchObject(b: Json): Json {
  const age = Date.now() - b._t0;
  if (b.status !== "completed" && age > 3000) {
    const lines = (files.get(b.input_file_id)?.content ?? "").split("\n").filter((l: string) => l.trim());
    const out = lines.map((l: string) => {
      const r = JSON.parse(l);
      const q = textOf(r.body?.messages?.at(-1)?.content ?? r.body?.input ?? "");
      const content = r.body?.response_format?.type === "json_schema" ? JSON.stringify(fromSchema(r.body.response_format.json_schema?.schema)) : `[réponse simulée en lot] ${q.slice(0, 60)}`;
      return JSON.stringify({ id: rid("batch_req_"), custom_id: r.custom_id, response: { status_code: 200, request_id: rid("req_"), body: { id: rid("chatcmpl-"), object: "chat.completion", model: r.body?.model, choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content } }], usage: { prompt_tokens: approxTokens(q) + 20, completion_tokens: approxTokens(content), total_tokens: approxTokens(q) + 20 + approxTokens(content) } } }, error: null });
    });
    const outId = rid("file-");
    files.set(outId, { content: out.reverse().join("\n") + "\n", filename: "resultats.jsonl", purpose: "batch_output" });
    Object.assign(b, { status: "completed", output_file_id: outId, completed_at: now(), request_counts: { total: lines.length, completed: lines.length, failed: 0 } });
  } else if (b.status === "validating" && age > 500) b.status = "in_progress";
  const { _t0, ...pub } = b;
  return pub;
}
async function batchesRoute(req: IncomingMessage, res: ServerResponse, url: string) {
  if (!authOk(req.headers.authorization)) return fail(res, 401, "Incorrect API key provided.", "invalid_request_error", "invalid_api_key");
  if (req.method === "POST" && /^\/v1\/batches\/?$/.test(url)) {
    const body = JSON.parse(await readBody(req));
    if (!files.has(body.input_file_id)) return fail(res, 400, `Invalid 'input_file_id': '${body.input_file_id}'.`, "invalid_request_error", null);
    const id = rid("batch_");
    const lines = files.get(body.input_file_id)!.content.split("\n").filter((l) => l.trim()).length;
    const b = { id, object: "batch", endpoint: body.endpoint, input_file_id: body.input_file_id, completion_window: body.completion_window, status: "validating", output_file_id: null, error_file_id: null, created_at: now(), request_counts: { total: lines, completed: 0, failed: 0 }, _t0: Date.now() };
    batches.set(id, b);
    return send(res, 200, batchObject(b));
  }
  const m = /^\/v1\/batches\/([^/?]+)/.exec(url);
  const b = m && batches.get(m[1]);
  if (!b) return fail(res, 404, "No such batch.", "invalid_request_error", null);
  send(res, 200, batchObject(b));
}

function realtime(ws: WebSocket) {
  const send = (e: Json) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ event_id: rid("event_"), ...e }));
  const conversation: string[] = [];
  let session: Json = { type: "realtime", id: rid("sess_"), object: "realtime.session", output_modalities: ["audio"], instructions: "" };
  let current: { id: string; cancelled: boolean } | null = null;
  send({ type: "session.created", session });

  ws.on("message", async (raw) => {
    let e: Json;
    try { e = JSON.parse(raw.toString()); } catch { return send({ type: "error", error: { type: "invalid_request_error", message: "Invalid JSON" } }); }
    switch (e.type) {
      case "session.update":
        session = { ...session, ...e.session };
        return send({ type: "session.updated", session });
      case "conversation.item.create": {
        const text = textOf(e.item?.content);
        conversation.push(text);
        return send({ type: "conversation.item.added", item: { id: rid("item_"), ...e.item } });
      }
      case "response.cancel":
        if (current) current.cancelled = true;
        return;
      case "response.create": {
        if (current) return send({ type: "error", error: { type: "invalid_request_error", code: "conversation_already_has_active_response", message: "Conversation already has an active response in progress." } });
        if (!(session.output_modalities ?? []).includes("text")) {
          return send({ type: "error", error: { type: "invalid_request_error", message: "Le faux serveur ne sait produire que du texte : session.output_modalities = [\"text\"]." } });
        }
        const r = { id: rid("resp_"), cancelled: false };
        current = r;
        const itemId = rid("item_");
        send({ type: "response.created", response: { id: r.id, object: "realtime.response", status: "in_progress", output: [] } });
        await sleep(FIRST_TOKEN_MS);
        const text = simulated(conversation.at(-1) ?? "");
        let produced = "";
        for (const piece of text.match(/\S+\s*/g) ?? []) {
          if (r.cancelled || ws.readyState !== WebSocket.OPEN) break;
          produced += piece;
          send({ type: "response.output_text.delta", response_id: r.id, item_id: itemId, output_index: 0, content_index: 0, delta: piece });
          await sleep(TOKEN_MS);
        }
        const status = r.cancelled ? "cancelled" : "completed";
        if (!r.cancelled) send({ type: "response.output_text.done", response_id: r.id, item_id: itemId, output_index: 0, content_index: 0, text: produced });
        const it = approxTokens(conversation.join(" ")), ot = approxTokens(produced);
        send({ type: "response.done", response: { id: r.id, object: "realtime.response", status, usage: { input_tokens: it, output_tokens: ot, total_tokens: it + ot } } });
        if (r.cancelled) console.log("  ↳ réponse temps réel annulée");
        current = null;
        return;
      }
      default:
        return send({ type: "error", error: { type: "invalid_request_error", message: `Événement inconnu du faux serveur : ${e.type}` } });
    }
  });
}

const http = createServer(async (req, res) => {
  const t0 = Date.now();
  res.setHeader("x-request-id", rid("req_"));
  const url = req.url ?? "";
  try {
    if (req.method === "POST" && url.startsWith("/v1/chat/completions")) await chatCompletions(req, res);
    else if (req.method === "POST" && url.startsWith("/v1/responses")) await responses(req, res);
    else if (req.method === "POST" && url.startsWith("/v1/audio/speech")) await speech(req, res);
    else if (req.method === "POST" && url.startsWith("/v1/audio/transcriptions")) await transcriptions(req, res);
    else if (req.method === "POST" && url.startsWith("/v1/images/generations")) await imagesGenerate(req, res);
    else if (req.method === "POST" && /^\/v1\/files\/?$/.test(url)) await filesUpload(req, res);
    else if (req.method === "GET" && /^\/v1\/files\/[^/]+\/content/.test(url)) {
      const f = files.get(url.split("/")[3]);
      if (!f) fail(res, 404, "No such file.", "invalid_request_error", null);
      else { res.writeHead(200, { "content-type": "application/octet-stream" }); res.end(f.content); }
    } else if (url.startsWith("/v1/batches")) await batchesRoute(req, res, url);
    else if (req.method === "GET" && url.startsWith("/v1/models")) {
      if (!authOk(req.headers.authorization)) return fail(res, 401, "Incorrect API key provided.", "invalid_request_error", "invalid_api_key");
      send(res, 200, { object: "list", data: ["gpt-4.1-mini", "gpt-4.1", "gpt-realtime-2.1-mini", "text-embedding-3-small"].map((id) => ({ id, object: "model", created: 1700000000, owned_by: "system" })) });
    } else fail(res, 404, `Route inconnue du faux serveur : ${req.method} ${url}`, "invalid_request_error", "unknown_url");
  } catch (e) {
    fail(res, 500, String(e), "server_error", null);
  } finally {
    console.log(`${req.method} ${url} → ${res.statusCode} (${Date.now() - t0} ms)`);
  }
});

const wss = new WebSocketServer({ noServer: true });
http.on("upgrade", (req, socket, head) => {
  if (!(req.url ?? "").startsWith("/v1/realtime")) return socket.destroy();
  if (!authOk(req.headers.authorization)) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    return socket.destroy();
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    console.log(`WS ${req.url} → 101 (session temps réel ouverte)`);
    realtime(ws);
  });
});

http.listen(PORT, () => {
  console.log(`Faux serveur OpenAI sur http://localhost:${PORT}/v1  (RPM=${RPM}, QUOTA=${QUOTA}, FAIL_RATE=${FAIL_RATE}, STREAM_ERROR_RATE=${STREAM_ERROR_RATE})`);
  console.log(`Dans .env : OPENAI_BASE_URL=http://localhost:${PORT}/v1`);
});
