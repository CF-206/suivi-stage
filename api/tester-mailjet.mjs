/**
 * Suivi Stage — test des identifiants Mailjet.
 *
 * POST https://<ton-app>.vercel.app/api/tester-mailjet
 *   { "apiKey": "...", "apiSecret": "...", "fromEmail": "...", "fromName": "..." }
 *
 * Envoie un mail de test à l'adresse expéditeur pour vérifier que les
 * identifiants sont bons et que l'adresse est validée chez Mailjet.
 */

import { envoyerEmail } from './_lib/mailjet.mjs';

function nettoyer(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const repondre = (statut, corps) => res.status(statut).json(corps);

  try {
    if (req.method !== 'POST') {
      return repondre(405, { error: 'Méthode non autorisée (POST attendu).' });
    }

    let payload = {};
    try {
      payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
    } catch {
      return repondre(400, { error: 'Corps de requête invalide.' });
    }

    const apiKey = nettoyer(payload.apiKey);
    const apiSecret = nettoyer(payload.apiSecret);
    const fromEmail = nettoyer(payload.fromEmail);
    const fromName = nettoyer(payload.fromName) || 'Suivi Stage';

    if (!apiKey || !apiSecret || !fromEmail) {
      return repondre(400, { error: 'Clé API, clé secrète et adresse expéditeur requis.' });
    }

    const reponse = await envoyerEmail(
      {
        to: fromEmail,
        toName: '',
        subject: '✅ Test d’envoi — Suivi Stage',
        text:
          'Ceci est un mail de test envoyé par Suivi Stage.\n\n' +
          'Si tu le reçois, tes identifiants Mailjet sont corrects et tes relances ' +
          'pourront partir.',
        html: `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#f4f5fb;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e4e7f2;">
    <tr><td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:22px 24px;color:#fff;font-weight:800;">Suivi Stage</td></tr>
    <tr><td style="padding:24px;font-size:15px;line-height:1.6;color:#171a2b;">
      <h1 style="margin:0 0 12px;font-size:18px;">✅ Test d’envoi réussi</h1>
      <p style="margin:0 0 12px;">Si tu reçois ce mail, tes identifiants Mailjet sont corrects et tes relances pourront partir.</p>
      <p style="margin:0;color:#767d95;font-size:13px;">Expédié depuis ${fromEmail}</p>
    </td></tr>
  </table></body></html>`,
      },
      { apiKey, apiSecret, fromEmail, fromName },
    );

    if (!reponse.ok) {
      const detail = reponse.body ?? {};
      const message =
        detail?.ErrorMessage ??
        detail?.ErrorInfo ??
        detail?.message ??
        `Erreur Mailjet ${reponse.status}`;
      return repondre(400, {
        ok: false,
        error: 'Envoi de test impossible.',
        message,
        indice:
          reponse.status === 401
            ? 'Clé API ou clé secrète incorrecte (Account Settings > API Keys).'
            : 'Vérifie que l’adresse expéditeur est validée (Senders & Domains).',
      });
    }

    return repondre(200, {
      ok: true,
      message: `Mail de test envoyé à ${fromEmail} ✓`,
    });
  } catch (e) {
    return repondre(500, {
      error: 'Erreur inattendue',
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
