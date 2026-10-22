import { InfoCompletion, InfoFieldDef, calculerCompletion } from './info';

/** Informations de l'entreprise (contact, présence web, localisation). */
export interface Entreprise {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  linkedin: string;
  siteWeb: string;
  ville: string;
  secteur: string;
  notes: string;
  /** Personne en charge du recrutement (optionnel) */
  contactPrenom: string;
  contactNom: string;
  contactCivilite: string; // 'Madame' | 'Monsieur' | ''
}

export const ENTREPRISE_FIELDS: InfoFieldDef[] = [
  {
    key: 'nom',
    label: "Nom de l'entreprise",
    type: 'text',
    placeholder: 'Capgemini',
    required: true,
  },
  {
    key: 'email',
    label: 'Email (recrutement)',
    type: 'email',
    placeholder: 'recrutement@capgemini.com',
  },
  {
    key: 'telephone',
    label: 'Téléphone',
    type: 'tel',
    placeholder: '03 20 10 20 20',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    type: 'url',
    placeholder: 'https://linkedin.com/company/capgemini',
  },
  {
    key: 'siteWeb',
    label: 'Site web',
    type: 'url',
    placeholder: 'https://www.capgemini.com',
  },
  {
    key: 'ville',
    label: 'Ville',
    type: 'text',
    placeholder: 'Lille',
  },
  {
    key: 'secteur',
    label: 'Secteur',
    type: 'text',
    placeholder: 'ESN / Start-Up / Industrie',
  },
  {
    key: 'contactCivilite',
    label: 'Civilité du contact',
    type: 'text',
    placeholder: 'Madame / Monsieur',
  },
  {
    key: 'contactPrenom',
    label: 'Prénom du recruteur',
    type: 'text',
    placeholder: 'Marie',
  },
  {
    key: 'contactNom',
    label: 'Nom du recruteur',
    type: 'text',
    placeholder: 'Dupont',
  },
];

/**
 * Pour une candidature spontanée, on ne demande que l'essentiel :
 * nom (obligatoire), téléphone, email de recrutement, LinkedIn
 * + les coordonnées du recruteur (prénom / nom).
 */
export const ENTREPRISE_FIELDS_SPONTANEE: InfoFieldDef[] =
  ENTREPRISE_FIELDS.filter((f) =>
    [
      'nom',
      'telephone',
      'email',
      'linkedin',
      'contactCivilite',
      'contactPrenom',
      'contactNom',
    ].includes(f.key),
  );

export function champsEntreprise(origine: 'offre' | 'spontanee'): InfoFieldDef[] {
  return origine === 'spontanee' ? ENTREPRISE_FIELDS_SPONTANEE : ENTREPRISE_FIELDS;
}

export function entrepriseVide(): Entreprise {
  return {
    id: crypto.randomUUID(),
    nom: '',
    email: '',
    telephone: '',
    linkedin: '',
    siteWeb: '',
    ville: '',
    secteur: '',
    notes: '',
    contactPrenom: '',
    contactNom: '',
    contactCivilite: '',
  };
}

/** Nom complet du recruteur (si renseigné). */
export function nomRecruteur(entreprise: Entreprise): string {
  const prenom = (entreprise.contactPrenom ?? '').trim();
  const nom = (entreprise.contactNom ?? '').trim();
  return [prenom, nom].filter(Boolean).join(' ');
}

/** Formule d'appel utilisée dans le mail de relance. */
export function formuleAppel(entreprise: Entreprise): string {
  const prenom = (entreprise.contactPrenom ?? '').trim();
  const nom = (entreprise.contactNom ?? '').trim();
  const civilite = (entreprise.contactCivilite ?? '').trim();

  if (civilite && nom) return `Bonjour ${civilite} ${nom},`;
  if (civilite && prenom) return `Bonjour ${civilite} ${prenom},`;
  if (prenom && nom) return `Bonjour ${prenom} ${nom},`;
  if (prenom) return `Bonjour ${prenom},`;
  if (nom) return `Bonjour ${nom},`;
  return 'Bonjour,';
}

/** Taux de complétion des infos entreprise (selon l'origine de la candidature). */
export function completionEntreprise(
  entreprise: Entreprise,
  origine: 'offre' | 'spontanee' = 'offre',
): InfoCompletion {
  return calculerCompletion(champsEntreprise(origine), entreprise);
}
