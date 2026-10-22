import { Injectable, inject, signal } from '@angular/core';
import { Candidature } from '../models/candidature';
import { Profil } from '../models/profil';
import { SupabaseService } from './supabase.service';

/** Résultat de l'envoi d'une relance. */
export interface ResultatEnvoi {
  ok: boolean;
  /** Message à afficher (succès ou erreur). */
  texte: string;
  /** Adresse utilisé comme expéditeur. */
  expediteur?: string;
}

/**
 * Envoi direct du mail de relance au recruteur.
 *
 * L'app appelle la serverless function `/api/envoyer-relance` (déployée sur
 * Vercel) en passant son jeton de session Supabase : c'est donc l'adresse du
 * compte connecté qui sert d'expéditeur, et la RLS garantit qu'on ne peut
 * agir que sur ses propres candidatures.
 */
@Injectable({ providedIn: 'root' })
export class RelanceService {
  private readonly supabase = inject(SupabaseService);

  /** Un envoi est en cours. */
  readonly enCours = signal(false);

  /** Dernier message (succès ou erreur) affiché dans la modale. */
  readonly message = signal<{ ok: boolean; texte: string } | null>(null);

  /**
   * Envoie la relance par email.
   * @param candidature la candidature relancée
   * @param destinataire adresse du recruteur
   * @param objet objet du mail
   * @param corps corps du mail
   */
  async envoyer(
    candidature: Candidature,
    destinataire: string,
    objet: string,
    corps: string,
  ): Promise<ResultatEnvoi> {
    this.enCours.set(true);
    this.message.set(null);

    try {
      const client = this.supabase.client;
      if (!client) {
        const erreur = {
          ok: false,
          texte: "Supabase n'est pas configuré : envoi d'email impossible.",
        };
        this.message.set(erreur);
        return erreur;
      }

      const { data } = await client.auth.getSession();
      const jeton = data.session?.access_token;
      if (!jeton) {
        const erreur = { ok: false, texte: 'Session expirée : reconnecte-toi.' };
        this.message.set(erreur);
        return erreur;
      }

      const reponse = await fetch('/api/envoyer-relance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jeton}`,
        },
        body: JSON.stringify({
          candidatureId: candidature.id,
          destinataire,
          objet,
          corps,
          entreprise: candidature.entreprise,
          candidat: candidature.candidat,
        }),
      });

      const type = reponse.headers.get('content-type') ?? '';
      if (!type.includes('application/json')) {
        // En local (ng serve), l'endpoint n'existe pas : la page renvoie du HTML.
        const erreur = {
          ok: false,
          texte:
            "L'envoi direct n'est disponible que sur la version en ligne (Vercel). En local, utilise « Ouvrir dans Outlook ».",
        };
        this.message.set(erreur);
        return erreur;
      }

      const data2 = await reponse.json();

      if (!reponse.ok || !data2?.ok) {
        const erreur = {
          ok: false,
          texte: data2?.error ?? `Erreur ${reponse.status}`,
        };
        this.message.set(erreur);
        return erreur;
      }

      const succes = { ok: true, texte: data2.message ?? 'Mail envoyé.' };
      this.message.set(succes);
      return { ...succes, expediteur: data2.expediteur };    } catch (e) {
      const erreur = {
        ok: false,
        texte:
          e instanceof Error && e.message.includes('Failed to fetch')
            ? "Impossible de joindre le serveur d'envoi (connexion ?)."
            : e instanceof Error
              ? e.message
              : String(e),
      };
      this.message.set(erreur);
      return erreur;
    } finally {
      this.enCours.set(false);
    }
  }
}
