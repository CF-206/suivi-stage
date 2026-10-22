import { describe, expect, it } from 'vitest';
import { formuleAppel, nomRecruteur } from './entreprise';

const entreprise = (contact: Partial<ReturnType<typeof base>>) => ({
  ...base(),
  ...contact,
});

function base() {
  return {
    id: 'x',
    nom: 'Capgemini',
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

describe('nomRecruteur', () => {
  it('concatène prénom et nom', () => {
    expect(
      nomRecruteur(entreprise({ contactPrenom: 'Marie', contactNom: 'Dupont' })),
    ).toBe('Marie Dupont');
  });

  it('tolère un seul des deux', () => {
    expect(nomRecruteur(entreprise({ contactNom: 'Dupont' }))).toBe('Dupont');
    expect(nomRecruteur(entreprise({ contactPrenom: 'Marie' }))).toBe('Marie');
  });

  it('renvoie une chaîne vide si rien n\'est renseigné', () => {
    expect(nomRecruteur(entreprise({}))).toBe('');
  });
});

describe('formuleAppel', () => {
  it('utilise la civilité et le nom', () => {
    expect(
      formuleAppel(
        entreprise({
          contactCivilite: 'Madame',
          contactPrenom: 'Marie',
          contactNom: 'Dupont',
        }),
      ),
    ).toBe('Bonjour Madame Dupont,');
  });

  it('retombe sur le prénom seul', () => {
    expect(formuleAppel(entreprise({ contactPrenom: 'Marie' }))).toBe(
      'Bonjour Marie,',
    );
  });

  it('retombe sur prénom + nom sans civilité', () => {
    expect(
      formuleAppel(entreprise({ contactPrenom: 'Marie', contactNom: 'Dupont' })),
    ).toBe('Bonjour Marie Dupont,');
  });

  it('retombe sur "Bonjour," sans contact', () => {
    expect(formuleAppel(entreprise({}))).toBe('Bonjour,');
  });
});
