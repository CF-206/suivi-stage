import { describe, expect, it } from 'vitest';
import { creerExempleCandidature, EXEMPLE_PROFIL } from './exemple';

describe('données d\'exemple', () => {
  const exemple = creerExempleCandidature();

  it('ne contient qu\'une seule candidature', () => {
    expect(exemple.entreprise.nom).toBe('Capgemini');
    expect(exemple.poste).toBe('Développeur Web Angular');
    expect(exemple.origine).toBe('offre');
  });

  it('est complète (entreprise, recruteur, dates)', () => {
    expect(exemple.entreprise.email.length).toBeGreaterThan(0);
    expect(exemple.entreprise.telephone.length).toBeGreaterThan(0);
    expect(exemple.entreprise.linkedin.length).toBeGreaterThan(0);
    expect(exemple.entreprise.contactPrenom).toBe('Camille');
    expect(exemple.entreprise.contactNom).toBe('Delcourt');
    expect(exemple.dateDepot.length).toBeGreaterThan(0);
    expect(exemple.dateLimit.length).toBeGreaterThan(0);
  });

  it('propose un profil exemple complet', () => {
    expect(EXEMPLE_PROFIL.nom).toBe('Durand');
    expect(EXEMPLE_PROFIL.email.length).toBeGreaterThan(0);
    expect(EXEMPLE_PROFIL.telephone.length).toBeGreaterThan(0);
  });
});
