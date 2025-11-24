import { Scenario, AccountRow } from './types';
import { generateId } from './utils';

// Helper to create rows quickly
const createRow = (code: string, name: string, debit: number, credit: number, isVat: boolean): AccountRow => ({
  id: generateId(),
  code,
  name,
  debit,
  credit,
  isVat
});

export const scenarios: Scenario[] = [
  {
    id: 1,
    name: "Scénario 1 : Classique - TVA à Payer",
    description: "Une entreprise commerciale standard avec plus de ventes que d'achats.",
    rows: [
      createRow("1000", "Capital souscrit", 0, 60000, false),
      createRow("2400", "Mobilier et matériel de bureau", 12000, 0, false),
      createRow("2409", "Amort. sur mobilier", 0, 3000, false),
      createRow("4000", "Clients", 28000, 0, false),
      createRow("4110", "TVA à récupérer sur achats", 5200, 0, true),
      createRow("4111", "TVA déductible intracommunautaire", 900, 0, true),
      createRow("4114", "TVA à récup. régularisation (NC)", 0, 150, true), // Solde créditeur exceptionnel mais possible lors de correction
      createRow("4400", "Fournisseurs", 0, 21000, false),
      createRow("4510", "TVA à payer sur ventes", 0, 7800, true),
      createRow("4511", "TVA à payer intracommunautaire", 0, 650, true),
      createRow("4512", "TVA à payer import + report", 0, 430, true),
      createRow("4513", "TVA due sur travaux immobiliers", 0, 120, true),
      createRow("4530", "Précompte professionnel retenu", 0, 3100, false),
      createRow("5500", "Banque", 87000, 0, false)
    ]
  },
  {
    id: 2,
    name: "Scénario 2 : Investissement important - TVA à Récupérer",
    description: "L'entreprise a acheté une grosse machine ce mois-ci.",
    rows: [
      createRow("1000", "Capital", 0, 100000, false),
      createRow("2300", "Installations techniques", 80000, 0, false),
      createRow("4000", "Clients", 15000, 0, false),
      createRow("4110", "TVA à récupérer sur achats", 2400, 0, true),
      createRow("4115", "TVA déductible sur investissements", 16800, 0, true),
      createRow("4400", "Fournisseurs", 0, 96800, false),
      createRow("4510", "TVA à payer sur ventes", 0, 8500, true),
      createRow("4513", "TVA Cocontractant (Dette)", 0, 1500, true),
      createRow("4118", "TVA Cocontractant (Créance)", 1500, 0, true),
      createRow("5500", "Banque", 25000, 0, false),
      createRow("6100", "Services et biens divers", 5000, 0, false),
      createRow("7000", "Chiffre d'affaires", 0, 40000, false)
    ]
  },
  {
    id: 3,
    name: "Scénario 3 : Balance Équilibrée (Rare)",
    description: "Un cas rare où la TVA à payer égale presque la TVA à récupérer.",
    rows: [
      createRow("4000", "Clients", 12100, 0, false),
      createRow("4110", "TVA à récupérer sur achats", 4200, 0, true),
      createRow("4400", "Fournisseurs", 0, 24200, false),
      createRow("4510", "TVA à payer sur ventes", 0, 4200, true),
      createRow("6040", "Achats de marchandises", 20000, 0, false),
      createRow("7000", "Ventes de marchandises", 0, 20000, false),
      createRow("5500", "Banque", 12100, 0, false)
    ]
  },
  {
    id: 4,
    name: "Scénario 4 : Régularisations et Notes de Crédit",
    description: "Beaucoup de mouvements correctifs ce mois-ci.",
    rows: [
      createRow("4000", "Clients", 5000, 0, false),
      createRow("4110", "TVA à récupérer sur achats", 3000, 0, true),
      createRow("4114", "TVA à récup. régul. (NC reçues)", 0, 200, true), // Crédit car on rend de la TVA à l'état (diminution de déductible)
      createRow("4400", "Fournisseurs", 0, 8000, false),
      createRow("4510", "TVA à payer sur ventes", 0, 6000, true),
      createRow("4514", "TVA due régul. (NC envoyées)", 400, 0, true), // Débit car on récupère de la TVA à payer (diminution de dette)
      createRow("5500", "Banque", 25000, 0, false),
      createRow("6000", "Achats", 15000, 0, false),
      createRow("7000", "Ventes", 0, 30000, false)
    ]
  },
  {
    id: 5,
    name: "Scénario 5 : Intracommunautaire pur",
    description: "Activité fortement tournée vers l'UE.",
    rows: [
      createRow("4110", "TVA à récupérer (Belgique)", 1000, 0, true),
      createRow("4111", "TVA déductible intracom", 4500, 0, true),
      createRow("4510", "TVA à payer (Belgique)", 0, 2000, true),
      createRow("4511", "TVA à payer intracom", 0, 4500, true),
      createRow("4000", "Clients", 20000, 0, false),
      createRow("4400", "Fournisseurs", 0, 15000, false),
      createRow("5500", "Banque", 4000, 0, false)
    ]
  }
];

export const MANUAL_ACCOUNTS = [
  { code: "4119", name: "Compte courant administration TVA (À récupérer)" },
  { code: "4519", name: "Compte courant administration TVA (À payer)" }
];