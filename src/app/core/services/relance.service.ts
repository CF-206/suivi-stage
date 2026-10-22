import { Injectable, inject, signal } from '@angular/core';
import { Candidature } from '../models/candidature';
import { Profil } from '../models/profil';
import { mailtoLink, construireRelance } from '../utils/relance';
import { SupabaseService } from './supabase.service';

/** Résultat de l'envoi d'une relance. */
export interface ResultatEnvoi {
  ok: boolean;
  /** Message à afficher (succès ou erreur). */
  texte: string;
  /** Lien mailto généré (ouvert dans le client mail de l'utilisateur). */
  lienMailto?: string;
}

/**
 * Service d'envoi de relance par email.
 *
 * Utilise des liens mailto: pour ouvrir le client mail de l'utilisateur
 * (Outlook, Gmail, etc.). Cela ne nécessite pas d'API Mailjet ni de
 * compte serveur - l'email part directement depuis la boîte de l'utilisateur.
 */
@Injectable({ providedIn: 'root' })
export class RelanceService {
  private readonly supabase = inject(SupabaseService);

  /** Un envoi est en cours. */
  readonly enCours = signal(false);

  /** Dernier message (succès ou erreur) affiché dans la modale. */
  readonly message = signal<{ ok: boolean; texte: string } | null>(null);

  /** Dernier lien mailto généré. */
  readonly lienGeneré = signal<string | null>(null);

  /**
   * Prépare une relance en générant un lien mailto:.
   * L'utilisateur doit cliquer sur le lien ou sur le bouton "Ouvrir dans Outlook"
   * dans l'interface pour envoyer le mail depuis sa propre boîte.
   *
   * @param candidature la candidature relancée
   * @param profil les informations de l'utilisateur (nom, email, téléphone)
   */
  async preparer(
    candidature: Candidature,
    profil: Profil,
  ): Promise<ResultatEnvoi> {
    this.enCours.set(true);
    this.message.set(null);
    this.lienGeneré.set(null);

    try {
      const relance = construireRelance(candidature, profil);
      const lien = mailtoLink(relance);

      this.lienGeneré.set(lien);

      return {
        ok: true,
        texte: 'Préparation de la relance effectuée ✓',
        lienMailto: lien,
      };
    } catch (e) {
      const erreur = {
        ok: false,
        texte:
          e instanceof Error ? e.message : String(e),
      };
      this.message.set(erreur);
      return erreur;
    } finally {
      this.enCours.set(false);
    }
  }
}