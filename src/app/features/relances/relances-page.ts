import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Candidature,
  joursDepuisRelance,
  prochaineRelance,
  relanceDue,
} from '../../core/models/candidature';
import { CandidatureService } from '../../core/services/candidature.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-relances-page',
  imports: [RouterLink],
  templateUrl: './relances-page.html',
  styleUrl: './relances-page.scss',
})
export class RelancesPage {
  private readonly service = inject(CandidatureService);
  protected readonly notifications = inject(NotificationService);

  /** Chargement des données depuis Supabase. */
  protected readonly chargement = this.service.chargement;

  /** Candidatures dont la relance est due, les plus anciennes d'abord. */
  protected readonly dues = computed(() =>
    this.service
      .candidatures()
      .filter((c) => relanceDue(c))
      .sort((a, b) => (a.dateDepot ?? '').localeCompare(b.dateDepot ?? '')),
  );

  /** Candidatures en cours, avec le jour de la prochaine relance. */
  protected readonly aVenir = computed(() =>
    this.service
      .candidatures()
      .filter(
        (c) =>
          !relanceDue(c) && ['nouveau', 'postule'].includes(c.statut) && (c.dateDepot ?? '') !== '',
      )
      .sort((a, b) => (a.dateDepot ?? '').localeCompare(b.dateDepot ?? '')),
  );

  protected jours(c: Candidature): number | null {
    return joursDepuisRelance(c);
  }

  protected prochaine(c: Candidature): string {
    return prochaineRelance(c) ?? '—';
  }

  protected async activerNotifications(): Promise<void> {
    await this.notifications.demanderPermission();
    if (this.notifications.permission() === 'granted') {
      await this.notifications.notifierSiNecessaire(this.service.candidatures());
    }
  }
}
