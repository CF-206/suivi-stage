import { describe, expect, it } from 'vitest';
import { calculerCompletion } from './info';
import { ENTREPRISE_FIELDS, entrepriseVide } from './entreprise';
import { PROFIL_FIELDS, profilVide } from './profil';

describe('calculerCompletion (entreprise)', () => {
  it('compte les champs remplis', () => {
    const completion = calculerCompletion(ENTREPRISE_FIELDS, {
      ...entrepriseVide(),
      nom: 'Capgemini',
      email: 'contact@capgemini.com',
    });
    expect(completion.remplis).toBe(2);
    expect(completion.valide).toBe(true);
  });

  it('exige le nom de l\'entreprise', () => {
    const completion = calculerCompletion(ENTREPRISE_FIELDS, {
      ...entrepriseVide(),
      ville: 'Lille',
    });
    expect(completion.valide).toBe(false);
  });

  it('liste les champs manquants', () => {
    const completion = calculerCompletion(ENTREPRISE_FIELDS, {
      ...entrepriseVide(),
      nom: 'Capgemini',
    });
    const cles = completion.manquants.map((m) => m.key);
    expect(cles).toContain('email');
    expect(cles).not.toContain('nom');
  });
});

describe('calculerCompletion (profil)', () => {
  it('le nom est obligatoire', () => {
    expect(calculerCompletion(PROFIL_FIELDS, profilVide()).valide).toBe(false);
    expect(
      calculerCompletion(PROFIL_FIELDS, { ...profilVide(), nom: 'Dupont' }).valide,
    ).toBe(true);
  });
});
