import { Candidature } from '../models/candidature';
import { formuleAppel } from '../models/entreprise';
import { Profil } from '../models/profil';

export interface Relance {
  destinataire: string;
  objet: string;
  corps: string;
}

function formatDate(iso: string): string {
  if (!iso) return 'la date de mon envoi';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Génère le brouillon de relance (entreprise + poste + signature perso). */
export function construireRelance(
  candidature: Candidature,
  profil: Profil,
): Relance {
  const e = candidature.entreprise;
  const nom = profil.nom?.trim() ?? '';
  const prenom = profil.prenom?.trim() ?? '';

  const objet = `Relance – Candidature ${candidature.poste || 'stage'} – ${e.nom || 'entreprise'}`;

  const contact: string[] = [];
  if (profil.email) contact.push(`cette adresse (${profil.email})`);
  if (profil.telephone) contact.push(`le ${profil.telephone}`);

  // Formule d'appel adaptée : "Bonjour Madame Dupont," si le recruteur est connu,
  // sinon "Bonjour,".
  const corps = [
    formuleAppel(e),
    '',
    `Je me permets de revenir vers vous suite à ma candidature au poste de ${candidature.poste || 'votre offre'}, envoyée le ${formatDate(candidature.dateDepot)}, pour laquelle je n'ai pas encore eu de retour de votre part.`,
    '',
    candidature.lien ? `Ma candidature en ligne : ${candidature.lien}` : '',
    '',
    contact.length > 0
      ? `Je reste disponible pour un entretien ou pour vous transmettre tout complément d'information. Vous pouvez me joindre via ${contact.join(' ou ')}.`
      : "Je reste disponible pour un entretien ou pour vous transmettre tout complément d'information.",
    '',
    `En vous remerciant de l'attention portée à ma candidature, je vous prie d'agréer, ${prenom} ${nom}, l'expression de mes salutations distinguées.`,
  ]
    .filter((l) => l !== undefined)
    .join('\n');

  return { destinataire: e.email ?? '', objet, corps };
}

/** Construit un lien mailto: pour ouvrir la relance dans Outlook. */
export function mailtoLink(relance: Relance): string {
  const params = new URLSearchParams({
    subject: relance.objet,
    body: relance.corps,
  });
  const to = relance.destinataire ? `?${params.toString()}` : `?${params.toString()}`;
  return `mailto:${encodeURIComponent(relance.destinataire)}${to}`;
}
