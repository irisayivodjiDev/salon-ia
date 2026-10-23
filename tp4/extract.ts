// TP 4.1 — Sorties structurées avec la Responses API : du texte libre vers un objet typé et validé.
// Cas : trier les tickets du support de la plateforme Orion (données fictives).
//
// Responses API ≠ Chat Completions : on envoie un « input » (texte ou liste d'éléments),
// les consignes vont dans « instructions », le format de sortie dans « text.format »,
// et la réponse est une liste d'éléments « output » (le SDK en extrait output_text / output_parsed).
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { config, openai } from "../src/config.js";

// Le schéma est la SPÉCIFICATION : il sert au modèle (contrainte) ET à votre code (validation, types).
const Ticket = z.object({
  categorie: z.enum(["bug", "facturation", "acces", "demande_fonctionnalite", "autre"]),
  priorite: z.enum(["P1", "P2", "P3"]),
  resume: z.string().max(140),
  client: z.string().nullable(),
  produit: z.string().nullable(),
  action_suggeree: z.string(),
});
type Ticket = z.infer<typeof Ticket>;

const tickets = [
  "Bonjour, depuis ce matin 8h plus personne chez Brasserie Lumen ne peut se connecter à Orion Caisse, on a un service à midi !!! Merci de faire vite. — Julie",
  "Petite question : serait-il possible d'exporter les rapports mensuels d'Orion Stock en CSV plutôt qu'en PDF ? Ce serait bien pratique. Bonne journée, Karim (Atelier Nord)",
  "On a été facturés deux fois pour octobre (facture F-2026-1042), pouvez-vous rembourser le doublon ? Cordialement, compta Transports Vey",
];

const client = openai();

for (const text of tickets) {
  let parsed: Ticket | undefined;
  try {
    const response = await client.responses.parse({
      model: config.model,
      instructions: "Classe ce ticket de support. Résume-le en 140 caractères maximum et propose une action concrète.",
      input: text,
      text: { format: zodTextFormat(Ticket, "ticket") },
      temperature: 0,
      store: false,
    });
    parsed = response.output_parsed ?? undefined;
  } catch (error) {
    console.error("Erreur lors du traitement du ticket :", error);
    continue;
  }
  if (!parsed) {
    console.error("Aucun objet structuré n'a été renvoyé pour ce ticket.");
    continue;
  }

  // Ceinture ET bretelles : on revalide côté code. Le modèle peut se tromper, le schéma non.
  const check = Ticket.safeParse(parsed);
  console.log(check.success ? "✓" : "✗", JSON.stringify(parsed, null, 2), "\n");
}
