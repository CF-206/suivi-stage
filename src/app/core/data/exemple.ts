import { Candidature, candidatureVide } from '../models/candidature';
import { entrepriseVide } from '../models/entreprise';
import { Profil, profilVide } from '../models/profil';

/**
 * Un seul exemple de candidature + un profil exemple.
 *
 * Ils sont chargés automatiquement au premier lancement pour que l'app ne soit
 * pas vide (et pour illustrer le remplissage des formulaires). Supprimables à
 * tout moment.
 */

export const EXEMPLE_PROFIL: Profil = {
  ...profilVide(),
  nom: 'Durand',
  prenom: 'Lucas',
  email: 'lucas.durand@gmail.com',
  telephone: '06 42 18 77 03',
  linkedin: 'https://www.linkedin.com/in/lucas-durand-dev/',
  siteWeb: 'https://lucas-durand.dev',
  ville: 'Lille',
  formation: 'BUT Informatique — IUT de Lille',
  cv: 'https://drive.google.com/file/d/demo-cv-lucas-durand',
};

function iso(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export function creerExempleCandidature(): Candidature {
  const c = candidatureVide(
    {
      ...entrepriseVide(),
      nom: 'Capgemini',
      email: 'lille.candidatures@capgemini.com',
      telephone: '03 20 10 20 20',
      linkedin: 'https://www.linkedin.com/company/capgemini/',
      siteWeb: 'https://www.capgemini.com',
      ville: 'Lille',
      secteur: 'ESN / Conseil',
      contactCivilite: 'Madame',
      contactPrenom: 'Camille',
      contactNom: 'Delcourt',
    },
    { ...EXEMPLE_PROFIL },
    'offre',
  );

  // Id fixe : l'exemple ne doit pas être re-notifié à chaque lancement.
  c.id = 'exemple';

  c.poste = 'Développeur Web Angular';
  c.lieu = 'Lille';
  c.type = 'Alternance';
  c.statut = 'postule';
  c.dateDepot = iso(-12);
  c.dateAjout = iso(-11);
  c.dateLimit = iso(9);
  c.lien = 'https://www.capgemini.com/fr-fr/inscription-alternance';
  c.notes = 'Exemple : CV envoyé via le site, en attente de retour.';
  c.mailObjet = 'Capgemini — Votre candidature a bien été enregistrée';
  c.mailExpediteur = 'no-reply@capgemini.com';
  c.tags = [];

  return c;
}
