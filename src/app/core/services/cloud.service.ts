import { Injectable, inject } from '@angular/core';
import type { Candidature, OrigineCandidature, StatutCandidature } from '../models/candidature';
import type { Profil } from '../models/profil';
import { SupabaseService } from './supabase.service';

/** Ligne de la table `candidatures`. */
interface LigneCandidature {
  id: string;
  user_id: string;
  data: Candidature;
  origine: OrigineCandidature | null;
  entreprise_nom: string | null;
  poste: string | null;
  statut: StatutCandidature | null;
  date_ajout: string | null;
}

/** Ligne de la table `profils`. */
interface LigneProfil {
  user_id: string;
  data: Profil;
}

/**
 * Accès aux données sur Supabase.
 *
 * Les fiches complètes sont stockées en JSONB (`data`) : le schéma reste
 * stable même si l'app évolue, et quelques colonnes sont dupliquées
 * (entreprise, poste, statut) pour pouvoir trier/filtrer côté SQL.
 */
@Injectable({ providedIn: 'root' })
export class CloudService {
  private readonly supabase = inject(SupabaseService);

  /** Supabase est-il utilisable ? */
  get disponible(): boolean {
    return this.supabase.client !== null;
  }

  /** Charge toutes les candidatures d'un utilisateur. */
  async chargerCandidatures(userId: string): Promise<Candidature[]> {
    const client = this.supabase.client;
    if (!client) return [];

    const { data, error } = await client
      .from('candidatures')
      .select('id, user_id, data, origine, entreprise_nom, poste, statut, date_ajout')
      .eq('user_id', userId)
      .order('date_ajout', { ascending: false });

    if (error) throw error;

    return (data as LigneCandidature[]).map((ligne) => ligne.data);
  }

  /** Enregistre (ou met à jour) une candidature. */
  async enregistrerCandidature(userId: string, candidature: Candidature): Promise<void> {
    const client = this.supabase.client;
    if (!client) return;

    const { error } = await client.from('candidatures').upsert({
      id: candidature.id,
      user_id: userId,
      origine: candidature.origine ?? 'offre',
      data: candidature,
      entreprise_nom: candidature.entreprise?.nom ?? '',
      poste: candidature.poste ?? '',
      statut: candidature.statut,
      date_ajout: candidature.dateAjout,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  }

  /** Supprime une candidature. */
  async supprimerCandidature(userId: string, id: string): Promise<void> {
    const client = this.supabase.client;
    if (!client) return;

    const { error } = await client.from('candidatures').delete().eq('id', id).eq('user_id', userId);

    if (error) throw error;
  }

  /** Supprime toutes les candidatures d'un utilisateur. */
  async supprimerToutesCandidatures(userId: string): Promise<void> {
    const client = this.supabase.client;
    if (!client) return;

    const { error } = await client.from('candidatures').delete().eq('user_id', userId);

    if (error) throw error;
  }

  /** Charge le profil d'un utilisateur (`null` s'il n'en a pas encore). */
  async chargerProfil(userId: string): Promise<Profil | null> {
    const client = this.supabase.client;
    if (!client) return null;

    const { data, error } = await client
      .from('profils')
      .select('user_id, data')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return (data as LigneProfil).data ?? null;
  }

  /** Enregistre (ou met à jour) le profil d'un utilisateur. */
  async enregistrerProfil(userId: string, profil: Profil): Promise<void> {
    const client = this.supabase.client;
    if (!client) return;

    const { error } = await client.from('profils').upsert({
      user_id: userId,
      data: profil,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  }
}
