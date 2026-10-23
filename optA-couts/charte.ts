// Un long préfixe STABLE (données fictives) : la charte du support de la plateforme Orion.
// Environ 2 000 tokens : au-delà du seuil (1 024 tokens) qui rend un préfixe réutilisable en cache.
const regles = [
  "Répondre en français, en vouvoyant le client, sans jargon technique inutile.",
  "Classer chaque demande dans une seule catégorie : bug, facturation, accès, demande de fonctionnalité ou autre.",
  "Une production bloquée (caisse, prise de commande, paiement) est toujours une priorité P1.",
  "Une gêne importante sans blocage complet est une priorité P2 ; tout le reste est P3.",
  "Ne jamais promettre de délai de correction : renvoyer vers les engagements du contrat.",
  "Ne jamais demander de mot de passe, ni de code reçu par SMS, ni de numéro de carte.",
  "Un doublon de facturation est traité en P2 et transmis au service comptable sous 24 heures ouvrées.",
  "Les demandes de fonctionnalité sont remerciées, résumées, et versées au registre produit.",
  "Toute mention d'une donnée personnelle de santé ou bancaire est signalée au délégué à la protection des données.",
  "En cas de doute sur la catégorie, choisir « autre » et le dire explicitement.",
];
const produits = ["Orion Caisse", "Orion Stock", "Orion Planning", "Orion Paie", "Orion Fidélité"];

export const CHARTE = [
  "CHARTE DU SUPPORT ORION (document de référence, données fictives)",
  ...Array.from({ length: 6 }, (_, k) =>
    [
      `Chapitre ${k + 1} — application aux produits ${produits.join(", ")}.`,
      ...regles.map((r, i) => `Règle ${k + 1}.${i + 1} : ${r}`),
      `Exemple ${k + 1} : un client de ${produits[k % produits.length]} signale un problème ; on applique les règles ${k + 1}.1 à ${k + 1}.${regles.length} dans l'ordre.`,
    ].join("\n"),
  ),
].join("\n\n");
