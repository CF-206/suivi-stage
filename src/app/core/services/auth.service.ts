import { Injectable, computed, inject, signal } from '@angular/core';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

/** Message d'erreur lisible à partir d'une erreur Supabase. */
function messageErreur(erreur: unknown): string {
  const message = erreur instanceof Error ? erreur.message : String(erreur ?? '');
  if (/invalid login credentials/i.test(message)) {
    return 'Email ou mot de passe incorrect.';
  }
  if (/user already registered/i.test(message)) {
    return 'Un compte existe déjà avec cet email.';
  }
  if (/password should be at least/i.test(message)) {
    return 'Le mot de passe doit faire au moins 6 caractères.';
  }
  if (/email not confirmed/i.test(message)) {
    return 'Email non confirmé : clique sur le lien reçu par mail.';
  }
  if (/failed to fetch|network/i.test(message)) {
    return 'Connexion impossible : vérifie ton accès internet.';
  }
  return message || 'Une erreur est survenue.';
}

/**
 * Authentification Supabase (email + mot de passe).
 *
 * L'état de session est exposé via des signaux :
 * - `user()` : l'utilisateur connecté (ou `null`)
 * - `chargement()` : la session est-elle en cours de résolution ?
 * - `erreur()` : dernier message d'erreur
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  readonly user = signal<User | null>(null);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly message = signal<string | null>(null);

  /** Une session est-elle active ? */
  readonly connecte = computed(() => this.user() !== null);

  /** L'email de l'utilisateur connecté (pour l'afficher dans l'en-tête). */
  readonly email = computed(() => this.user()?.email ?? '');

  /** Supabase est-il configuré (sinon l'app reste en mode local) ? */
  readonly disponible = this.supabase.configure;

  constructor() {
    const client = this.supabase.client;
    if (!client) {
      this.chargement.set(false);
      return;
    }

    void this.restaurerSession(client);

    client.auth.onAuthStateChange((_evenement, session: Session | null) => {
      this.user.set(session?.user ?? null);
      this.chargement.set(false);
    });
  }

  /** Crée un compte (si l'email doit être confirmé, un message est renvoyé). */
  async inscription(email: string, motDePasse: string): Promise<boolean> {
    const client = this.supabase.client;
    if (!client) return false;

    this.erreur.set(null);
    this.message.set(null);

    const { data, error } = await client.auth.signUp({
      email,
      password: motDePasse,
    });

    if (error) {
      this.erreur.set(messageErreur(error));
      return false;
    }

    if (!data.session) {
      this.message.set(
        'Compte créé ! Vérifie ta boîte mail pour confirmer ton email, puis connecte-toi.',
      );
      return true;
    }

    this.user.set(data.user);
    return true;
  }

  /** Ouvre une session. */
  async connexion(email: string, motDePasse: string): Promise<boolean> {
    const client = this.supabase.client;
    if (!client) return false;

    this.erreur.set(null);
    this.message.set(null);

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password: motDePasse,
    });

    if (error) {
      this.erreur.set(messageErreur(error));
      return false;
    }

    this.user.set(data.user);
    return true;
  }

  /** Ferme la session. */
  async deconnexion(): Promise<void> {
    const client = this.supabase.client;
    if (!client) return;
    await client.auth.signOut();
    this.user.set(null);
  }

  /** Ouvre un lien de réinitialisation de mot de passe. */
  async reinitialiserMotDePasse(email: string): Promise<boolean> {
    const client = this.supabase.client;
    if (!client) return false;

    this.erreur.set(null);
    this.message.set(null);

    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      this.erreur.set(messageErreur(error));
      return false;
    }

    this.message.set(
      'Si un compte existe avec cet email, tu vas recevoir un lien de réinitialisation.',
    );
    return true;
  }

  /** Efface le message d'erreur courant (affiché dans le formulaire). */
  clearErreur(): void {
    this.erreur.set(null);
    this.message.set(null);
  }

  private async restaurerSession(client: SupabaseClient): Promise<void> {
    try {
      const { data } = await client.auth.getSession();
      this.user.set(data.session?.user ?? null);
    } catch {
      this.user.set(null);
    } finally {
      this.chargement.set(false);
    }
  }
}
