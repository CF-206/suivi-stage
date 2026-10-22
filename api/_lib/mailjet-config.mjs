/**
 * Récupération des identifiants Mailjet.
 *
 * Priorité :
 *  1. le compte Mailjet personnel de l'utilisateur (table `mailjet_credentials`) ;
 *  2. le compte Mailjet de l'application (variables d'environnement).
 *
 * Les identifiants personnels sont lus avec le jeton de l'utilisateur : la RLS
 * garantit qu'on ne récupère que la ligne qui le concerne.
 */

/**
 * Identifiants Mailjet utilisables pour un envoi.
 * @typedef {{apiKey: string, apiSecret: string, fromEmail: string, fromName: string, personnel: boolean}} IdentifiantsMailjet
 */

/** Identifiants Mailjet de l'application (variables d'environnement). */
export function identifiantsApplication(env = process.env) {
  return {
    apiKey: env.MAILJET_API_KEY ?? '',
    apiSecret: env.MAILJET_API_SECRET ?? '',
    fromEmail: env.MAILJET_FROM_EMAIL ?? '',
    fromName: env.MAILJET_FROM_NAME ?? 'Suivi Stage',
    personnel: false,
  };
}

/**
 * Lit le compte Mailjet personnel d'un utilisateur.
 * @param {string} url URL du projet Supabase
 * @param {string} cle cle du projet (anon ou service_role)
 * @param {string|undefined} token jeton de l'utilisateur (RLS) ou undefined
 * @param {string|undefined} userId identifiant de l'utilisateur (cle service_role)
 * @returns {Promise<IdentifiantsMailjet|null>}
 */
export async function identifiantsUtilisateur(url, cle, token, userId) {
  try {
    const headers = { apikey: cle, 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else if (userId) {
      headers.Authorization = `Bearer ${cle}`;
    }

    let requete =
      `${url}/rest/v1/mailjet_credentials?select=api_key,api_secret,from_email,from_name`;
    if (!token && userId) requete += `&user_id=eq.${userId}`;

    const reponse = await fetch(requete, { headers });
    if (!reponse.ok) return null;

    const lignes = await reponse.json();
    const ligne = Array.isArray(lignes) ? lignes[0] : lignes;
    if (!ligne?.api_key || !ligne?.api_secret) return null;

    return {
      apiKey: ligne.api_key,
      apiSecret: ligne.api_secret,
      fromEmail: ligne.from_email ?? '',
      fromName: ligne.from_name ?? 'Suivi Stage',
      personnel: true,
    };
  } catch {
    return null;
  }
}

/**
 * Identifiants à utiliser pour un envoi : ceux de l'utilisateur s'il en a,
 * sinon ceux de l'application.
 * @returns {Promise<IdentifiantsMailjet>}
 */
export async function choisirIdentifiants(url, cle, token, userId, env = process.env) {
  const personnel = await identifiantsUtilisateur(url, cle, token, userId);
  return personnel ?? identifiantsApplication(env);
}
