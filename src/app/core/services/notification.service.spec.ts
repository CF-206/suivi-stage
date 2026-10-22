import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';
import { candidatureVide } from '../models/candidature';
import { entrepriseVide } from '../models/entreprise';
import { profilVide } from '../models/profil';

function candidature(id: string, jours: number) {
  const c = candidatureVide(
    { ...entrepriseVide(), nom: 'Entreprise ' + id },
    profilVide(),
    'offre',
  );
  c.id = id;
  c.statut = 'postule';
  c.dateDepot = new Date(Date.now() - jours * 86_400_000).toISOString().slice(0, 10);
  return c;
}

describe('NotificationService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('signale les nouvelles relances à faire', async () => {
    const service = TestBed.inject(NotificationService);
    const resultat = await service.notifierSiNecessaire([
      candidature('a', 10),
      candidature('b', 3),
    ]);

    // Seule 'a' est due (plus de 7 jours)
    expect(resultat).toBe(1);
    expect(service.dejaNotifiees()).toEqual(['a']);
  });

  it('ne signale pas deux fois la même relance', async () => {
    const service = TestBed.inject(NotificationService);
    const liste = [candidature('a', 10)];

    expect(await service.notifierSiNecessaire(liste)).toBe(1);
    expect(await service.notifierSiNecessaire(liste)).toBe(0);
  });

  it('re-notifie après que la relance a été faite puis ré-échéance', async () => {
    const service = TestBed.inject(NotificationService);
    const liste = [candidature('a', 10)];

    expect(await service.notifierSiNecessaire(liste)).toBe(1);

    // La relance est faite : plus due -> le drapeau saute
    expect(await service.notifierSiNecessaire([])).toBe(0);
    expect(service.dejaNotifiees()).toEqual([]);

    // Nouvelle échéance : on re-notifie
    expect(await service.notifierSiNecessaire(liste)).toBe(1);
  });

  it('ignore les candidatures non dues', async () => {
    const service = TestBed.inject(NotificationService);
    const resultat = await service.notifierSiNecessaire([candidature('a', 2), candidature('b', 0)]);
    expect(resultat).toBe(0);
  });
});
