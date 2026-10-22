import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Candidature, StatutCandidature, candidatureVide } from '../models/candidature';
import { Entreprise, entrepriseVide } from '../models/entreprise';
import { profilVide } from '../models/profil';
import { creerExempleCandidature } from '../data/exemple';
import { AuthService } from './auth.service';
import { CloudService } from './cloud.service';
import { StorageService } from './storage.service';

const STORAGE_KEY = 'suivi-stage.v2.candidatures';
const PENDING_KEY = 'suivi-stage.v2.pending';

/** Modifications non encore poussées vers Supabase (mode hors-ligne). */
interface Pending {
  upserts: Candidature[];
  suppressions: string[];
}

/** Clé de cache local pour un utilisateur donné (ou pour le mode anonyme). */
function cleCache(userId: string | null): string {
  return userId ? `${STORAGE_KEY}.${userId}` : STORAGE_KEY;
}

/** Clé de la file d'attente hors-ligne pour un utilisateur donné. */
function clePending(userId: string | null): string {
  return userId ? `${PENDING_KEY}.${userId}` : PENDING_KEY;
}

/** Repli pour les anciens statuts (entretien, offre) vers le nouveau référentiel. */
function normaliserStatut(statut: string | undefined): StatutCandidature {
  switch (statut) {
    case 'postule':
    case 'refuse':
    case 'archive':
    case 'nouveau':
      return statut;
    case 'entretien':
    case 'offre':
      return 'postule';
    default:
      return 'nouveau';
  }
}

/**
 * Candidatures de l'utilisateur.
 *
 * **Supabase est la source de vérité** : tout est lu/écrit dans Supabase.
 * Le `localStorage` ne sert qu'au mode hors-ligne temporaire (cache) et à la
 * file d'attente des modifications à re-pousser au retour du réseau.
 */
@Injectable({ providedIn: 'root' })
export class CandidatureService {
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);
  private readonly cloud = inject(CloudService);

  private readonly _candidatures = signal<Candidature[]>(this.lireCache(null));

  /** Identifiant de l'utilisateur connecté (`null` en mode local). */
  private readonly userId = signal<string | null>(null);

  /** Un chargement (Supabase) est-il en cours ? */
  readonly chargement = signal(false);

  /** Dernière erreur de synchronisation (affichée discrètement). */
  readonly erreur = signal<string | null>(null);

  /** Des modifications sont en attente d'envoi vers Supabase. */
  readonly enAttente = signal(false);

  /** Les données sont-elles synchronisées avec Supabase ? */
  readonly synchronise = computed(() => this.userId() !== null);

  readonly candidatures = this._candidatures.asReadonly();

  readonly total = computed(() => this._candidatures().length);

  /** Candidatures qui répondent à une offre. */
  readonly offres = computed(() => this._candidatures().filter((c) => c.origine !== 'spontanee'));

  /** Candidatures envoyées de ton côté. */
  readonly spontanees = computed(() =>
    this._candidatures().filter((c) => c.origine === 'spontanee'),
  );

  /** Candidatures archivées (offre fermée) : hors de la liste principale. */
  readonly archivees = computed(() => this._candidatures().filter((c) => c.statut === 'archive'));

  readonly parStatut = computed(() => {
    const map = new Map<StatutCandidature, number>();
    for (const c of this._candidatures()) {
      map.set(c.statut, (map.get(c.statut) ?? 0) + 1);
    }
    return map;
  });

  constructor() {
    // Suit la session : on recharge les données de l'utilisateur connecté et
    // on repasse en mode local à la déconnexion.
    effect(() => {
      const user = this.auth.user();
      const userId = user?.id ?? null;
      untracked(() => void this.basculerUtilisateur(userId));
    });

    // Retour du réseau : on envoie les modifications en attente.
    window.addEventListener('online', () => void this.resynchroniser());
  }

  get(id: string): Candidature | undefined {
    return this._candidatures().find((c) => c.id === id);
  }

  /** Récupère les infos d'une entreprise déjà rencontrée (pour ne pas ressaisir). */
  entrepriseConnue(nom: string): Entreprise | undefined {
    const cible = nom.trim().toLowerCase();
    if (!cible) return undefined;
    return this._candidatures().find((c) => c.entreprise.nom.trim().toLowerCase() === cible)
      ?.entreprise;
  }

  add(candidature: Candidature): void {
    this._candidatures.update((list) => [candidature, ...list]);
    this.persist();
    this.pushCandidature(candidature);
  }

  update(id: string, patch: Partial<Candidature>): void {
    let misAJour: Candidature | undefined;
    this._candidatures.update((list) =>
      list.map((c) => {
        if (c.id !== id) return c;
        misAJour = { ...c, ...patch };
        return misAJour;
      }),
    );
    this.persist();
    if (misAJour) this.pushCandidature(misAJour);
  }

  setStatut(id: string, statut: StatutCandidature): void {
    this.update(id, { statut });
  }

  remove(id: string): void {
    this._candidatures.update((list) => list.filter((c) => c.id !== id));
    this.persist();
    void this.supprimerCandidature(id);
  }

  /** Vide toutes les candidatures. */
  clear(): void {
    const userId = this.userId();
    const ids = this._candidatures().map((c) => c.id);
    this._candidatures.set([]);
    this.persist();
    if (!userId || !this.cloud.disponible) return;

    void this.cloud
      .supprimerToutesCandidatures(userId)
      .then(() => this.ecrirePending(userId, { upserts: [], suppressions: [] }))
      .catch((e) => {
        this.signalerErreur(e);
        // Hors-ligne : on note la suppression de tout pour le prochain envoi.
        this.ecrirePending(userId, { upserts: [], suppressions: ids });
      });
  }

  /** Recharge l'exemple (une candidature de démonstration). */
  chargerExemple(): void {
    const exemple = creerExempleCandidature();
    this._candidatures.set([exemple]);
    this.persist();
    this.pushCandidature(exemple);
  }

  /** Efface le message d'erreur de synchronisation. */
  clearErreur(): void {
    this.erreur.set(null);
  }

  /**
   * Renvoie les modifications en attente vers Supabase puis recharge les
   * données distantes. Appelée au retour du réseau ou à la reconnexion.
   */
  async resynchroniser(): Promise<void> {
    const userId = this.userId();
    if (!userId || !this.cloud.disponible) return;

    this.chargement.set(true);
    try {
      await this.envoyerPending(userId);
      const distantes = await this.cloud.chargerCandidatures(userId);
      this._candidatures.set(distantes.map((c) => this.normaliser(c)));
      this.persist();
      this.erreur.set(null);
    } catch (e) {
      this.signalerErreur(e);
    } finally {
      this.chargement.set(false);
    }
  }

  /** Charge les données du cache local (mode anonyme ou utilisateur). */
  private lireCache(userId: string | null): Candidature[] {
    try {
      const raw = this.storage.read<string | null>(cleCache(userId), null);
      // Premier lancement en mode local : on amorce avec la candidature
      // d'exemple pour illustrer le remplissage.
      if (raw === null) {
        return userId === null ? [creerExempleCandidature()] : [];
      }
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Candidature[];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((c) => this.normaliser(c));
    } catch {
      return [];
    }
  }

  /** Cache local anonyme, sans l'amorce d'exemple (migration vers un compte). */
  private lireCacheAnonyme(): Candidature[] {
    try {
      const raw = this.storage.read<string | null>(cleCache(null), null);
      if (raw === null) return [];
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Candidature[];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((c) => this.normaliser(c));
    } catch {
      return [];
    }
  }

  /** Ramène une candidature au format actuel (gère l'ancien format "entreprise: string"). */
  private normaliser(c: Candidature): Candidature {
    const entreprise =
      typeof c.entreprise === 'string'
        ? { ...entrepriseVide(), nom: c.entreprise }
        : { ...entrepriseVide(), ...c.entreprise };

    const base = candidatureVide(entreprise, {
      ...profilVide(),
      ...(c.candidat ?? {}),
    });

    return {
      ...base,
      ...c,
      entreprise,
      candidat: { ...profilVide(), ...(c.candidat ?? {}) },
      documents: c.documents ?? [],
      tags: c.tags ?? [],
      statut: normaliserStatut(c.statut),
      origine: c.origine === 'spontanee' ? 'spontanee' : 'offre',
      dateAjout: c.dateAjout ?? c.dateDepot ?? new Date().toISOString(),
      dateRelance: c.dateRelance ?? '',
      nbRelances: c.nbRelances ?? 0,
    };
  }

  private persist(): void {
    this.storage.write(cleCache(this.userId()), this._candidatures());
  }

  /** Bascule entre le mode local (anonyme) et le compte connecté. */
  private async basculerUtilisateur(userId: string | null): Promise<void> {
    if (this.userId() === userId) return;
    this.userId.set(userId);

    if (!userId || !this.cloud.disponible) {
      this._candidatures.set(this.lireCache(userId));
      return;
    }

    this.chargement.set(true);
    this.erreur.set(null);

    try {
      // 1. On envoie d'abord ce qui est resté en attente (mode hors-ligne).
      await this.envoyerPending(userId);

      // 2. On recharge la source de vérité : Supabase.
      const distantes = await this.cloud.chargerCandidatures(userId);

      if (distantes.length === 0) {
        // Première connexion : on récupère les données éventuellement saisies
        // en mode local (avant la création du compte).
        const locales = this.lireCacheAnonyme();
        for (const c of locales) {
          await this.cloud.enregistrerCandidature(userId, c);
        }
        this._candidatures.set(locales);
      } else {
        this._candidatures.set(distantes.map((c) => this.normaliser(c)));
      }

      this.persist();
    } catch (e) {
      this.signalerErreur(e);
      this._candidatures.set(this.lireCache(userId));
    } finally {
      this.chargement.set(false);
    }
  }

  private pushCandidature(candidature: Candidature): void {
    const userId = this.userId();
    if (!userId || !this.cloud.disponible) return;

    void this.cloud
      .enregistrerCandidature(userId, candidature)
      .then(() => {
        this.retirerPendingUpsert(userId, candidature.id);
      })
      .catch((e) => {
        this.signalerErreur(e);
        this.ajouterPendingUpsert(userId, candidature);
      });
  }

  private async supprimerCandidature(id: string): Promise<void> {
    const userId = this.userId();
    if (!userId || !this.cloud.disponible) return;

    try {
      await this.cloud.supprimerCandidature(userId, id);
      this.retirerPendingSuppression(userId, id);
    } catch (e) {
      this.signalerErreur(e);
      this.ajouterPendingSuppression(userId, id);
    }
  }

  // --- File d'attente hors-ligne -------------------------------------------

  private lirePending(userId: string): Pending {
    try {
      const brut = this.storage.read<Pending | null>(clePending(userId), null);
      if (!brut) return { upserts: [], suppressions: [] };
      return {
        upserts: Array.isArray(brut.upserts) ? brut.upserts : [],
        suppressions: Array.isArray(brut.suppressions) ? brut.suppressions : [],
      };
    } catch {
      return { upserts: [], suppressions: [] };
    }
  }

  private ecrirePending(userId: string, pending: Pending): void {
    this.storage.write(clePending(userId), pending);
    this.enAttente.set(pending.upserts.length > 0 || pending.suppressions.length > 0);
  }

  private ajouterPendingUpsert(userId: string, candidature: Candidature): void {
    const pending = this.lirePending(userId);
    pending.upserts = [...pending.upserts.filter((c) => c.id !== candidature.id), candidature];
    this.ecrirePending(userId, pending);
  }

  private retirerPendingUpsert(userId: string, id: string): void {
    const pending = this.lirePending(userId);
    pending.upserts = pending.upserts.filter((c) => c.id !== id);
    this.ecrirePending(userId, pending);
  }

  private ajouterPendingSuppression(userId: string, id: string): void {
    const pending = this.lirePending(userId);
    pending.upserts = pending.upserts.filter((c) => c.id !== id);
    pending.suppressions = [...pending.suppressions.filter((s) => s !== id), id];
    this.ecrirePending(userId, pending);
  }

  private retirerPendingSuppression(userId: string, id: string): void {
    const pending = this.lirePending(userId);
    pending.suppressions = pending.suppressions.filter((s) => s !== id);
    this.ecrirePending(userId, pending);
  }

  /** Envoie la file d'attente hors-ligne vers Supabase. */
  private async envoyerPending(userId: string): Promise<void> {
    const pending = this.lirePending(userId);
    if (pending.upserts.length === 0 && pending.suppressions.length === 0) {
      this.enAttente.set(false);
      return;
    }

    for (const c of pending.upserts) {
      await this.cloud.enregistrerCandidature(userId, c);
    }
    for (const id of pending.suppressions) {
      await this.cloud.supprimerCandidature(userId, id);
    }
    this.ecrirePending(userId, { upserts: [], suppressions: [] });
  }

  private signalerErreur(e: unknown): void {
    const message = e instanceof Error ? e.message : String(e);
    this.erreur.set(`Synchronisation impossible : ${message}`);
  }
}
