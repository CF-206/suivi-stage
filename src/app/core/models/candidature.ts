import { Entreprise, entrepriseVide } from './entreprise';
import { Profil, profilVide } from './profil';

export type StatutCandidature =
  | 'nouveau'
  | 'postule'
  | 'refuse'
  | 'archive';

export const STATUTS: StatutCandidature[] = [
  'nouveau',
  'postule',
  'refuse',
  'archive',
];

export const STATUT_LABELS: Record<StatutCandidature, string> = {
  nouveau: 'Nouveau',
  postule: 'Postulé',
  refuse: 'Refusé',
  archive: 'Archivé',
};

export interface DocumentEnvoye {
  nom: string;
  type: 'cv' | 'lettre' | 'portfolio' | 'autre';
  lien?: string;
  envoyeLe?: string; // ISO
}

/** Une candidature répond à une offre, ou est envoyée de ton côté (spontanée). */
export type OrigineCandidature = 'offre' | 'spontanee';

export const ORIGINES: OrigineCandidature[] = ['offre', 'spontanee'];

export const ORIGINE_LABELS: Record<OrigineCandidature, string> = {
  offre: 'Offre',
  spontanee: 'Spontanée',
};

export interface Candidature {
  id: string;
  /** 'offre' = réponse à une offre, 'spontanee' = candidature de ton côté */
  origine: OrigineCandidature;
  /** Infos de l'entreprise (contact, web, ville…) */
  entreprise: Entreprise;
  /** Infos de l'offre */
  poste: string;
  lieu: string;
  type: string;
  dateLimit: string; // ISO
  dateDepot: string; // ISO (date de postulation)
  dateAjout: string; // ISO (date de création de la fiche dans l'app)
  dateRelance: string; // ISO (dernière relance envoyée)
  nbRelances: number;
  lien: string;
  /** Copie de mes infos perso au moment de la candidature (pour la relance) */
  candidat: Profil;
  mailObjet: string;
  mailExpediteur: string;
  mailId: string;
  statut: StatutCandidature;
  notes: string;
  tags: string[];
  documents: DocumentEnvoye[];
}

export function candidatureVide(
  entreprise: Entreprise = entrepriseVide(),
  candidat: Profil = profilVide(),
  origine: OrigineCandidature = 'offre',
): Candidature {
  return {
    id: crypto.randomUUID(),
    origine,
    entreprise: { ...entreprise },
    poste: '',
    lieu: '',
    type: '',
    dateLimit: '',
    dateDepot: '',
    dateAjout: new Date().toISOString(),
    dateRelance: '',
    nbRelances: 0,
    lien: '',
    candidat: { ...candidat },
    mailObjet: '',
    mailExpediteur: '',
    mailId: '',
    statut: 'nouveau',
    notes: '',
    tags: [],
    documents: [],
  };
}

/** On relance une fois par semaine. */
export const DELAI_RELANCE_JOURS = 7;

/** Date de référence de la relance : la dernière relance, sinon l'envoi de la candidature. */
export function referenceRelance(candidature: Candidature): string {
  return candidature.dateRelance || candidature.dateDepot;
}

/** Nombre de jours écoulés depuis la dernière relance (ou depuis l'envoi). */
export function joursDepuisRelance(candidature: Candidature): number | null {
  const base = referenceRelance(candidature);
  if (!base) return null;
  const diff = Date.now() - new Date(base).getTime();
  if (Number.isNaN(diff)) return null;
  return Math.floor(diff / 86_400_000);
}

/** Une relance est à faire quand 7 jours ont passé depuis la dernière relance. */
export function relanceDue(candidature: Candidature): boolean {
  if (!['nouveau', 'postule'].includes(candidature.statut)) return false;
  const jours = joursDepuisRelance(candidature);
  return jours !== null && jours >= DELAI_RELANCE_JOURS;
}

/** Date de la prochaine relance à programmer (ISO). */
export function prochaineRelance(candidature: Candidature): string | null {
  const base = referenceRelance(candidature);
  if (!base) return null;
  const date = new Date(base);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + DELAI_RELANCE_JOURS);
  return date.toISOString().slice(0, 10);
}

/** Nombre de jours avant la prochaine relance (négatif = en retard). */
export function joursAvantProchaineRelance(candidature: Candidature): number | null {
  const prochaine = prochaineRelance(candidature);
  if (!prochaine) return null;
  const diff = new Date(prochaine).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}
