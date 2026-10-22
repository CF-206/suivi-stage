/** Configuration Mailjet personnelle d'un utilisateur (optionnelle). */
export interface ConfigMailjet {
  /** Clé API publique Mailjet. */
  apiKey: string;
  /** Clé API privée Mailjet. */
  apiSecret: string;
  /** Adresse expéditeur (doit être vérifiée dans Mailjet). */
  fromEmail: string;
  /** Nom de l'expéditeur (optionnel). */
  fromName: string;
}

export function configMailjetVide(): ConfigMailjet {
  return { apiKey: '', apiSecret: '', fromEmail: '', fromName: '' };
}

/** La configuration est-elle complète et exploitable ? */
export function mailjetValide(config: ConfigMailjet): boolean {
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(config.fromEmail.trim());
  return config.apiKey.trim() !== '' && config.apiSecret.trim() !== '' && email;
}
