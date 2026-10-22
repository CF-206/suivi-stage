/**
 * Suivi Stage — envoi direct du mail de relance au recruteur (Mailjet).
 *
 * POST https://<ton-app>.vercel.app/api/envoyer-relance
 *   Authorization: Bearer <jeton de session Supabase>
 *   Content-Type: application/json
 *   { "candidatureId": "...", "destinataire": "...", "objet": "...", "corps": "..." }
 *
 * - L'expéditeur est l'adresse email du compte connecté (vérifiée via l'API
 *   d'authentification Supabase).
 * - Le destinataire est l'adresse de contact de la candidature.
 * - Si l'adresse de l'utilisateur n'est pas validée comme expéditeur chez
 *   Mailjet, le mail part depuis MAILJET_FROM_EMAIL avec le Reply-To à
 *   l'utilisateur.
 */

import { envoyerEmail } from './_lib/mailjet.mjs';
import { construireHtmlRelance } from './_lib/relances.mjs';

/** Nettoie un en-tête (empêche l'injection d'en-têtes via \r\n). */
function nettoyer(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

/** Vérifie qu'une adresse email a l'air valide. */
function emailValide(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email ?? '').trim());
}

/** Récupère l'utilisateur à partir du jeton de session. */
async function utilisateurDepuisJeton(url, jeton) {
  // L'en-tête `apikey` doit contenir une clé du projet (pas le jeton de
  // l'utilisateur) ; le jeton, lui, passe dans `Authorization`.
  const cleProjet =
    process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  const reponse = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: cleProjet, Authorization: `Bearer ${jeton}` },
  });
  if (!reponse.ok) return null;
  const data = await reponse.json();
  return data?.email ? data : null;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const repondre = (statut, corps) => res.status(statut).json(corps);

  try {
    if (req.method !== 'POST') {
      return repondre(405, { error: 'Méthode non autorisée (POST attendu).' });
    }

    // --- Authentification : on récupère l'utilisateur connecté ------------
    const url = process.env.SUPABASE_URL;
    const autorisation = req.headers.authorization ?? '';
    const jeton = autorisation.startsWith('Bearer ') ? autorisation.slice(7) : '';

    if (!url || !jeton) {
      return repondre(401, { error: 'Session requise (jeton de connexion manquant).' });
    }

    const utilisateur = await utilisateurDepuisJeton(url, jeton);
    if (!utilisateur) {
      return repondre(401, { error: 'Session invalide ou expirée. Reconnecte-toi.' });
    }

    const emailExpediteur = utilisateur.email;

    // --- Configuration Mailjet --------------------------------------------
    if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_API_SECRET) {
      return repondre(500, {
        error: "L'envoi d'email n'est pas configuré (variables Mailjet manquantes).",
      });
    }

    // --- Contenu du mail ---------------------------------------------------
    let payload = {};
    try {
      payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
    } catch {
      return repondre(400, { error: 'Corps de requête invalide.' });
    }

    const destinataire =nettoyer(payload.destinataire);
    const objet = nettoyer(payload.objet);
    const corps = String(payload.corps ?? '').trim();

    if (!emailValide(destinataire)) {
      return repondre(400, { error: 'Adresse du destinataire invalide.' });
    }
    if (!objet) {
      return repondre(400, { error: "L'objet du mail est vide." });
    }
    if (!corps) {
      return repondre(400, { error: 'Le message est vide.' });
    }
    if (corps.length > 20000) {
      return repondre(400, { error: 'Le message est trop long (20 000 caractères max).' });
    }

    // --- Envoi -------------------------------------------------------------
    const html = construireHtmlRelance({
      objet,
      corps,
      entreprise: payload.entreprise ?? {},
      candidat: payload.candidat ?? {},
    });

    const base = {
      apiKey: process.env.MAILJET_API_KEY,
      apiSecret: process.env.MAILJET_API_SECRET,
      fromEmail: emailExpediteur,
      fromName: [utilisateur.user_metadata?.prenom, utilisateur.user_metadata?.nom]
        .filter(Boolean)
        .join(' ') || 'Suivi Stage',
    };

    let reponse = await envoyerEmail(
      { to: destinataire, toName: '', subject: objet, text: corps, html },
      { ...base, replyTo: emailExpediteur },
    );

    let expediteurUtilise = emailExpediteur;

    // Repli : l'adresse de l'utilisateur n'est pas validée chez Mailjet.
    if (!reponse.ok && reponse.status === 400 && process.env.MAILJET_FROM_EMAIL) {
      reponse = await envoyerEmail(
        { to: destinataire, toName: '', subject: objet, text: corps, html },
        {
          ...base,
          fromEmail: process.env.MAILJET_FROM_EMAIL,
          fromName: process.env.MAILJET_FROM_NAME || 'Suivi Stage',
          replyTo: emailExpediteur,
        },
      );
      expediteurUtilise = process.env.MAILJET_FROM_EMAIL;
    }

    if (!reponse.ok) {
      return repondre(502, {
        error: "L'envoi du mail a échoué.",
        detail: reponse.body ?? reponse.error,
      });
    }

    return repondre(200, {
      ok: true,
      message: `Mail envoyé à ${destinataire}.`,
      destinataire,
      expediteur: expediteurUtilise,
      replyTo: emailExpediteur,
    });
  } catch (e) {
    return repondre(500, {
      error: 'Erreur inattendue',
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
