import { describe, expect, it } from 'vitest';
import { construireRelance } from './relance';
import { candidatureVide } from '../models/candidature';
import { entrepriseVide } from '../models/entreprise';
import { profilVide } from '../models/profil';

describe('construireRelance', () => {
  const candidature = candidatureVide(
    {
      ...entrepriseVide(),
      nom: 'Capgemini',
      email: 'recrutement@capgemini.com',
    },
    {
      ...profilVide(),
      nom: 'Dupont',
      prenom: 'Jean',
      email: 'jean@mail.com',
      telephone: '06 12 34 56 78',
    },
  );
  candidature.poste = 'Développeur Web Angular';
  candidature.dateDepot = '2026-10-01';

  it('pré-remplit le destinataire avec l\'email de l\'entreprise', () => {
    expect(construireRelance(candidature, candidature.candidat).destinataire).toBe(
      'recrutement@capgemini.com',
    );
  });

  it('met le poste et l\'entreprise dans l\'objet', () => {
    const relance = construireRelance(candidature, candidature.candidat);
    expect(relance.objet).toContain('Développeur Web Angular');
    expect(relance.objet).toContain('Capgemini');
  });

  it('signe le message avec le nom et le contact', () => {
    const relance = construireRelance(candidature, candidature.candidat);
    expect(relance.corps).toContain('Jean Dupont');
    expect(relance.corps).toContain('jean@mail.com');
    expect(relance.corps).toContain('06 12 34 56 78');
  });

  it('utilise la formule d\'appel avec le recruteur quand il est connu', () => {
    candidature.entreprise.contactCivilite = 'Madame';
    candidature.entreprise.contactPrenom = 'Camille';
    candidature.entreprise.contactNom = 'Delcourt';

    const relance = construireRelance(candidature, candidature.candidat);
    expect(relance.corps.startsWith('Bonjour Madame Delcourt,')).toBe(true);
  });

  it('retombe sur "Bonjour," sans recruteur', () => {
    candidature.entreprise.contactPrenom = '';
    candidature.entreprise.contactNom = '';
    candidature.entreprise.contactCivilite = '';

    const relance = construireRelance(candidature, candidature.candidat);
    expect(relance.corps.startsWith('Bonjour,')).toBe(true);
  });
});
