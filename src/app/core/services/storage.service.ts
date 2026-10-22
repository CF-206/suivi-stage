import { Injectable } from '@angular/core';

/**
 * Stockage local des données de l'app (cache hors-ligne).
 *
 * La source de vérité est Supabase quand l'app est connectée : ce service ne
 * sert que de cache local, scopé par utilisateur, et permet à l'app de
 * continuer à fonctionner si le réseau est indisponible.
 *
 * L'API est synchrone pour que les services métier restent simples.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  read<T>(key: string, defaut: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return defaut;
      return JSON.parse(raw) as T;
    } catch {
      return defaut;
    }
  }

  write<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* stockage indisponible : on ignore */
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}
