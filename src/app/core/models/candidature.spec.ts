import { describe, expect, it } from 'vitest';
import {
  candidatureVide,
  joursAvantProchaineRelance,
  prochaineRelance,
  relanceDue,
} from './candidature';
import { entrepriseVide } from './entreprise';
import { profilVide } from './profil';

function candidature(overrides: Partial<ReturnType<typeof candidatureVide>> = {}) {
  return {
    ...candidatureVide(entrepriseVide(), profilVide()),
    poste: 'Développeur',
    ...overrides,
  };
}

function joursAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

describe('relanceDue (hebdomadaire)', () => {
  it('ne relance pas une candidature envoyée il y a moins de 7 jours', () => {
    expect(relanceDue(candidature({ dateDepot: joursAgo(2) }))).toBe(false);
  });

  it('relance une candidature envoyée il y a plus de 7 jours', () => {
    expect(relanceDue(candidature({ dateDepot: joursAgo(10) }))).toBe(true);
  });

  it('relance 7 jours après la dernière relance', () => {
    expect(
      relanceDue(
        candidature({ dateDepot: joursAgo(60), dateRelance: joursAgo(3) }),
      ),
    ).toBe(false);

    expect(
      relanceDue(
        candidature({ dateDepot: joursAgo(60), dateRelance: joursAgo(8) }),
      ),
    ).toBe(true);
  });

  it('ignore les candidatures refusées ou archivées', () => {
    expect(
      relanceDue(candidature({ dateDepot: joursAgo(20), statut: 'refuse' })),
    ).toBe(false);
    expect(
      relanceDue(candidature({ dateDepot: joursAgo(20), statut: 'archive' })),
    ).toBe(false);
  });

  it('calcule la date de la prochaine relance', () => {
    const c = candidature({ dateDepot: joursAgo(2), dateRelance: '' });
    const prochaine = prochaineRelance(c);
    expect(prochaine).not.toBeNull();
    expect(joursAvantProchaineRelance(c)).toBe(5);
  });
});
