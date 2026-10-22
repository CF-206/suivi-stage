import { Injectable } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * Client Supabase (créé une seule fois pour toute l'app).
 *
 * Si les variables d'environnement sont absentes (pas encore configurées),
 * `client` vaut `null` : l'app bascule alors en mode local (localStorage),
 * ce qui permet de continuer à développer sans Supabase.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient | null;

  /** La configuration Supabase est-elle disponible ? */
  readonly configure: boolean;

  constructor() {
    const url = environment.supabaseUrl;
    const cle = environment.supabaseAnonKey;

    if (url && cle) {
      this.client = createClient(url, cle, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      this.configure = true;
    } else {
      this.client = null;
      this.configure = false;
    }
  }
}
