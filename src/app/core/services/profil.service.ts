import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Profil, completionProfil, profilVide } from '../models/profil';
import { EXEMPLE_PROFIL } from '../data/exemple';
import { AuthService } from './auth.service';
import { CloudService } from './cloud.service';
import { StorageService } from './storage.service';

const STORAGE_KEY = 'suivi-stage.v2.profil';
const PENDING_KEY = 'suivi-stage.v2.profil.pending';

/** Clé de cache local pour un utilisateur donné (ou pour le mode anonyme). */
function cleCache(userId: string | null): string {
  return userId ? `${STORAGE_KEY}.${userId}` : STORAGE_KEY;
}

/**
 * Profil de l'utilisateur.
 *
 * Comme pour les candidatures, **Supabase est la source de vérité** : le
 * `localStorage` ne sert qu'au cache hors-ligne temporaire.
 */
@Injectable({ providedIn: 'root' })
export class ProfilService {
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);
  private readonly cloud = inject(CloudService);

  private readonly _profil = signal<Profil>(this.lireCache(null));

  /** Identifiant de l'utilisateur connecté (`null` en mode local). */
  private readonly userId = signal<string | null>(null);

  readonly chargement = signal(false);
  readonly erreur = signal<string | null>(null);

  /** Une modification du profil est en attente d'envoi. */
  readonly enAttente = signal(false);

  readonly profil = this._profil.asReadonly();
  readonly completion = computed(() => completionProfil(this._profil()));

  constructor() {
    effect(() => {
      const user = this.auth.user();
      const userId = user?.id ?? null;
      untracked(() => void this.basculerUtilisateur(userId));
    });

    // Retour du réseau : on envoie les modifications en attente.
    window.addEventListener('online', () => void this.resynchroniser());
  }

  update(patch: Partial<Profil>): void {
    this._profil.update((p) => ({ ...p, ...patch }));
    this.persist();
  }

  replace(profil: Profil): void {
    this._profil.set({ ...profil });
    this.persist();
  }

  /** Vider le profil (l'exemple du premier lancement). */
  reset(): void {
    this._profil.set(profilVide());
    this.persist();
  }

  /** Efface le message d'erreur de synchronisation. */
  clearErreur(): void {
    this.erreur.set(null);
  }

  /** Renvoie le profil en attente vers Supabase puis recharge le profil distant. */
  async resynchroniser(): Promise<void> {
    const userId = this.userId();
    if (!userId || !this.cloud.disponible) return;

    this.chargement.set(true);
    try {
      await this.envoyerPending(userId);
      const distant = await this.cloud.chargerProfil(userId);
      if (distant) {
        this._profil.set({ ...profilVide(), ...distant });
        this.persist();
      }
      this.erreur.set(null);
    } catch (e) {
      this.signalerErreur(e);
    } finally {
      this.chargement.set(false);
    }
  }

  /** Charge le profil depuis le cache local. */
  private lireCache(userId: string | null): Profil {
    try {
      const raw = this.storage.read<string | null>(cleCache(userId), null);
      // Premier lancement en mode local : profil d'exemple (à remplacer).
      if (raw === null) {
        return userId === null ? { ...EXEMPLE_PROFIL } : profilVide();
      }
      if (!raw) return profilVide();
      const parsed = JSON.parse(raw) as Partial<Profil>;
      return { ...profilVide(), ...parsed };
    } catch {
      return profilVide();
    }
  }

  /** Cache local anonyme, sans l'amorce d'exemple (migration vers un compte). */
  private lireCacheAnonyme(): Profil {
    try {
      const raw = this.storage.read<string | null>(cleCache(null), null);
      if (raw === null) return profilVide();
      if (!raw) return profilVide();
      const parsed = JSON.parse(raw) as Partial<Profil>;
      return { ...profilVide(), ...parsed };
    } catch {
      return profilVide();
    }
  }

  private persist(): void {
    const profil = this._profil();
    this.storage.write(cleCache(this.userId()), profil);

    const userId = this.userId();
    if (!userId || !this.cloud.disponible) return;

    void this.cloud
      .enregistrerProfil(userId, profil)
      .then(() => this.ecrirePending(userId, false))
      .catch((e) => {
        this.signalerErreur(e);
        this.ecrirePending(userId, true);
      });
  }

  /** Bascule entre le mode local (anonyme) et le compte connecté. */
  private async basculerUtilisateur(userId: string | null): Promise<void> {
    if (this.userId() === userId) return;
    this.userId.set(userId);

    if (!userId || !this.cloud.disponible) {
      this._profil.set(this.lireCache(userId));
      return;
    }

    this.chargement.set(true);
    this.erreur.set(null);

    try {
      // 1. File d'attente hors-ligne.
      await this.envoyerPending(userId);

      // 2. Source de vérité : Supabase.
      const distant = await this.cloud.chargerProfil(userId);

      if (distant) {
        this._profil.set({ ...profilVide(), ...distant });
      } else {
        // Première connexion : on reprend le profil saisi en mode local.
        const local = this.lireCacheAnonyme();
        this._profil.set(local);
        await this.cloud.enregistrerProfil(userId, local);
      }

      this.persist();
    } catch (e) {
      this.signalerErreur(e);
      this._profil.set(this.lireCache(userId));
    } finally {
      this.chargement.set(false);
    }
  }

  private lirePending(userId: string): boolean {
    try {
      return this.storage.read<boolean>(`${PENDING_KEY}.${userId}`, false) === true;
    } catch {
      return false;
    }
  }

  private ecrirePending(userId: string, enAttente: boolean): void {
    this.storage.write(`${PENDING_KEY}.${userId}`, enAttente);
    this.enAttente.set(enAttente);
  }

  private async envoyerPending(userId: string): Promise<void> {
    if (!this.lirePending(userId)) return;
    await this.cloud.enregistrerProfil(userId, this._profil());
    this.ecrirePending(userId, false);
  }

  private signalerErreur(e: unknown): void {
    const message = e instanceof Error ? e.message : String(e);
    this.erreur.set(`Synchronisation impossible : ${message}`);
  }
}
