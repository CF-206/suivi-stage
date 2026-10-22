import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Candidature, relanceDue } from '../models/candidature';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';

const NOTIFIED_KEY = 'suivi-stage.notifications';

/** Clé de cache local, scopée par utilisateur (mode local = clé globale). */
function cleCache(userId: string | null): string {
  return userId ? `${NOTIFIED_KEY}.${userId}` : NOTIFIED_KEY;
}

/**
 * Notifications navigateur pour les relances à faire.
 *
 * - L'app vérifie toutes les minutes les candidatures dont la relance est due
 * - Une notification n'est envoyée qu'une fois par candidature (et par cycle)
 * - Quand la relance est faite, le drapeau saute : il sera re-notifié à la
 *   prochaine échéance
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);

  /** L'utilisateur connecté (`null` en mode local). */
  private readonly userId = signal<string | null>(null);

  /** Le cache est rechargé quand l'utilisateur change. */
  readonly utilisateur = this.userId.asReadonly();

  /** Le navigateur supporte-t-il les notifications ? */
  readonly supporte = typeof Notification !== 'undefined';

  readonly permission = signal<NotificationPermission>(
    this.supporte ? Notification.permission : 'denied',
  );

  /** Candidatures déjà notifiées (pour ne pas spammer). */
  private readonly notifies = signal<string[]>(this.load());

  readonly dejaNotifiees = this.notifies.asReadonly();

  readonly actif = computed(() => this.permission() === 'granted');

  constructor() {
    // Les drapeaux "déjà notifié" sont propre à chaque utilisateur.
    effect(() => {
      const user = this.auth.user();
      const userId = user?.id ?? null;
      untracked(() => {
        if (this.userId() === userId) return;
        this.userId.set(userId);
        this.notifies.set(this.load());
      });
    });
  }

  /** Demande l'autorisation au navigateur (à un clic de l'utilisateur). */
  async demanderPermission(): Promise<boolean> {
    if (!this.supporte) return false;
    try {
      const result = await Notification.requestPermission();
      this.permission.set(result);
      return result === 'granted';
    } catch {
      this.permission.set('denied');
      return false;
    }
  }

  /**
   * Envoie une notification si des relances sont dues et pas encore notifiées.
   * @param candidatures toutes les candidatures connues
   * @returns le nombre de relances qui viennent d'être signalées
   */
  async notifierSiNecessaire(candidatures: Candidature[]): Promise<number> {
    const dues = candidatures.filter((c) => relanceDue(c));
    const dejaNotifiees = this.notifies();

    // On oublie celles qui ne sont plus dues (relance faite) : elles pourront
    // être re-notifiées au prochain cycle.
    const encoreDues = new Set(dues.map((c) => c.id));
    const conservees = dejaNotifiees.filter((id) => encoreDues.has(id));

    const nouvelles = dues.filter((c) => !conservees.includes(c.id));

    if (nouvelles.length === 0) {
      if (conservees.length !== dejaNotifiees.length) {
        this.notifies.set(conservees);
        this.persist();
      }
      return 0;
    }

    this.notifies.set([...conservees, ...nouvelles.map((c) => c.id)]);
    this.persist();

    if (this.permission() === 'granted') {
      this.envoyer(nouvelles);
    }

    return nouvelles.length;
  }

  /** Affiche une notification (silencieuse si l'onglet est visible). */
  private envoyer(candidatures: Candidature[]): void {
    if (!this.supporte) return;

    const premier = candidatures[0];
    const titre =
      candidatures.length === 1
        ? '🔔 Relance à faire'
        : `🔔 ${candidatures.length} relances à faire`;
    const corps =
      candidatures.length === 1
        ? `${premier.entreprise.nom} — ${premier.poste || 'candidature'}`
        : candidatures.map((c) => `• ${c.entreprise.nom}`).join('\n');

    try {
      const notification = new Notification(titre, {
        body: corps,
        tag: 'suivi-stage-relances',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        requireInteraction: true,
        data: { url: NotificationService.urlRelances },
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch {
      /* le navigateur peut refuser l'affichage */
    }
  }

  /** Ouvre la page des relances depuis une notification. */
  static urlRelances = '/relances';

  private load(): string[] {
    try {
      const parsed = this.storage.read<string[]>(cleCache(this.userId()), []);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persist(): void {
    this.storage.write(cleCache(this.userId()), this.notifies());
  }
}
