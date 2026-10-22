import { Injectable, inject, signal } from '@angular/core';
import { ConfigMailjet, configMailjetVide, mailjetValide } from '../models/mailjet';
import { SupabaseService } from './supabase.service';

/**
 * Compte Mailjet personnel de l'utilisateur (optionnel).
 *
 * Si l'utilisateur connecte son propre compte Mailjet, ses relances partent
 * depuis son adresse, avec son quota, et ne dépendent pas du compte de
 * l'application. Sinon, l'application utilise son compte par défaut.
 *
 * Les identifiants sont stockés dans la table `mailjet_credentials` :
 * la RLS garantit que seul l'utilisateur concerné peut les lire.
 */
@Injectable({ providedIn: 'root' })
export class MailjetService {
  private readonly supabase = inject(SupabaseService);

  /** Configuration enregistrée (vide si l'utilisateur n'en a pas). */
  readonly config = signal<ConfigMailjet>(configMailjetVide());

  /** L'utilisateur a-t-il connecté son propre compte Mailjet ? */
  readonly configure = signal(false);

  /** Chargement en cours. */
  readonly chargement = signal(false);

  /** Dernier message d'erreur. */
  readonly erreur = signal<string | null>(null);

  /** Charge la configuration de l'utilisateur connecté. */
  async charger(): Promise<void> {
    const client = this.supabase.client;
    if (!client) return;

    this.chargement.set(true);
    try {
      const { data, error } = await client
        .from('mailjet_credentials')
        .select('api_key, api_secret, from_email, from_name')
        .maybeSingle();

      if (error) {
        this.erreur.set(error.message);
        return;
      }

      if (data) {
        this.config.set({
          apiKey: data.api_key ?? '',
          apiSecret: data.api_secret ?? '',
          fromEmail: data.from_email ?? '',
          fromName: data.from_name ?? '',
        });
        this.configure.set(true);
      }
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.chargement.set(false);
    }
  }

  /** Enregistre (ou remplace) la configuration. */
  async enregistrer(config: ConfigMailjet): Promise<{ ok: boolean; message: string }> {
    const client = this.supabase.client;
    if (!client) {
      return { ok: false, message: "Supabase n'est pas configuré." };
    }
    if (!mailjetValide(config)) {
      return {
        ok: false,
        message: 'Renseigne la clé API, la clé secrète et une adresse expéditeur valide.',
      };
    }

    this.chargement.set(true);
    this.erreur.set(null);
    try {
      const { data: session } = await client.auth.getSession();
      const userId = session.session?.user?.id;
      if (!userId) {
        return { ok: false, message: 'Session expirée : reconnecte-toi.' };
      }

      const { error } = await client.from('mailjet_credentials').upsert({
        user_id: userId,
        api_key: config.apiKey.trim(),
        api_secret: config.apiSecret.trim(),
        from_email: config.fromEmail.trim(),
        from_name: config.fromName.trim() || null,
      });

      if (error) {
        this.erreur.set(error.message);
        return { ok: false, message: error.message };
      }

      this.config.set({
        apiKey: config.apiKey.trim(),
        apiSecret: config.apiSecret.trim(),
        fromEmail: config.fromEmail.trim(),
        fromName: config.fromName.trim(),
      });
      this.configure.set(true);
      return { ok: true, message: 'Compte Mailjet connecté ✓' };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.erreur.set(message);
      return { ok: false, message };
    } finally {
      this.chargement.set(false);
    }
  }

  /** Supprime la configuration (retour au compte Mailjet de l'application). */
  async supprimer(): Promise<void> {
    const client = this.supabase.client;
    if (!client) return;

    await client.from('mailjet_credentials').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
    this.config.set(configMailjetVide());
    this.configure.set(false);
  }
}
