import { InfoCompletion, InfoFieldDef, calculerCompletion } from './info';

/** Mes informations personnelles : servent à signer les relances. */
export interface Profil {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  linkedin: string;
  siteWeb: string;
  ville: string;
  formation: string;
  cv: string;
}

export const PROFIL_FIELDS: InfoFieldDef[] = [
  {
    key: 'nom',
    label: 'Nom',
    type: 'text',
    placeholder: 'Dupont',
    required: true,
  },
  {
    key: 'prenom',
    label: 'Prénom',
    type: 'text',
    placeholder: 'Jean',
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'jean.dupont@email.com',
  },
  {
    key: 'telephone',
    label: 'Téléphone',
    type: 'tel',
    placeholder: '06 12 34 56 78',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    type: 'url',
    placeholder: 'https://linkedin.com/in/jeandupont',
  },
  {
    key: 'siteWeb',
    label: 'Site web / Portfolio',
    type: 'url',
    placeholder: 'https://jean-dupont.dev',
  },
  {
    key: 'ville',
    label: 'Ville',
    type: 'text',
    placeholder: 'Lille',
  },
  {
    key: 'formation',
    label: 'Formation',
    type: 'text',
    placeholder: 'BUT Informatique — IUT de Lille',
  },
  {
    key: 'cv',
    label: 'Lien du CV',
    type: 'url',
    placeholder: 'https://drive.google.com/…',
  },
];

export function profilVide(): Profil {
  return {
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    linkedin: '',
    siteWeb: '',
    ville: '',
    formation: '',
    cv: '',
  };
}

export function completionProfil(profil: Profil): InfoCompletion {
  return calculerCompletion(PROFIL_FIELDS, profil);
}
