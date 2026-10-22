import { Component, OnDestroy, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { relanceDue } from '../../core/models/candidature';
import { AuthService } from '../../core/services/auth.service';
import { CandidatureService } from '../../core/services/candidature.service';
import { NotificationService } from '../../core/services/notification.service';

const INTERVALLE_MS = 60_000;

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell implements OnDestroy {
  private readonly candidatures = inject(CandidatureService);
  private readonly router = inject(Router);
  protected readonly notifications = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  /** Nombre de relances à faire (affiché sur la cloche). */
  protected readonly nbRelances = computed(
    () => this.candidatures.candidatures().filter((c) => relanceDue(c)).length,
  );

  /** Nombre de candidatures archivées (onglet dédié). */
  protected readonly nbArchivees = computed(() => this.candidatures.archivees().length);

  /** Erreur de synchronisation éventuelle. */
  protected readonly erreur = this.candidatures.erreur;

  /** Des modifications attendent d'être envoyées à Supabase. */
  protected readonly enAttente = this.candidatures.enAttente;

  /** La bannière "activer les notifications" a-t-elle été masquée ? */
  protected readonly banniereMasquee = signal(false);

  /** Faut-il proposer d'activer les notifications ? */
  protected readonly proposerNotifications = computed(
    () =>
      this.notifications.supporte &&
      this.notifications.permission() === 'default' &&
      !this.banniereMasquee(),
  );

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Notifications immédiates : à chaque changement de la liste (chargement
    // depuis Supabase, ajout, modification…), on vérifie les relances dues
    // sans attendre le prochain tick.
    effect(() => {
      const liste = this.candidatures.candidatures();
      untracked(() => void this.verifier(liste));
    });

    // Filet de sécurité : une relance peut devenir due au fil du temps
    // (passage d'un jour, minuit) sans qu'aucune donnée ne change.
    this.timer = setInterval(() => {
      void this.verifier(this.candidatures.candidatures());
    }, INTERVALLE_MS);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Vérifie les relances dues et déclenche une notification si besoin. */
  private async verifier(liste: Parameters<NotificationService['notifierSiNecessaire']>[0]) {
    await this.notifications.notifierSiNecessaire(liste);
  }

  /** Demande l'autorisation au navigateur pour les notifications. */
  protected async activerNotifications(): Promise<void> {
    await this.notifications.demanderPermission();
    this.banniereMasquee.set(true);
    await this.notifications.notifierSiNecessaire(this.candidatures.candidatures());
  }

  /** Masque la bannière sans activer quoi que ce soit. */
  protected masquerBanniere(): void {
    this.banniereMasquee.set(true);
  }

  /** Ferme la session et renvoie vers la page de connexion. */
  protected async deconnexion(): Promise<void> {
    await this.auth.deconnexion();
    await this.router.navigateByUrl('/connexion');
  }
}
