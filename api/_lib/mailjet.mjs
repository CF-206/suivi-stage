/**
 * Envoi d'email via l'API Mailjet v3.1.
 * (Dossier `_lib` : Vercel ne crée pas de route pour ces fichiers.)
 *
 * Documentation : https://dev.mailjet.com/docs/email-api/send-api-v31/send-basic-email
 */

const API_URL = 'https://api.mailjet.com/v3.1/send';

/**
 * Envoie un email via Mailjet.
 * @param {{to: string, toName?: string, subject: string, text: string, html: string, replyTo?: string}} message
 * @param {{apiKey: string, apiSecret: string, fromEmail: string, fromName?: string, replyTo?: string}} config
 * @returns {Promise<{ok: boolean, status: number, body?: unknown, error?: string}>}
 */
export async function envoyerEmail(message, config) {
  const { apiKey, apiSecret, fromEmail, fromName } = config;

  if (!apiKey || !apiSecret) {
    return { ok: false, status: 0, error: 'Identifiants Mailjet manquants.' };
  }
  if (!fromEmail) {
    return { ok: false, status: 0, error: 'Adresse expéditeur manquante (MAILJET_FROM_EMAIL).' };
  }

  const basic = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

  const replyTo = message.replyTo ?? config.replyTo;

  const payload = {
    Messages: [
      {
        From: { Email: fromEmail, Name: fromName || 'Suivi Stage' },
        To: [{ Email: message.to, Name: message.toName || '' }],
        Subject: message.subject,
        TextPart: message.text,
        HTMLPart: message.html,
        ...(replyTo ? { ReplyTo: { Email: replyTo } } : {}),
      },
    ],
  };

  try {
    const reponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const texte = await reponse.text();
    let corps = texte;
    try {
      corps = JSON.parse(texte);
    } catch {
      /* on garde le texte brut */
    }

    if (!reponse.ok) {
      return { ok: false, status: reponse.status, body: corps, error: `Mailjet ${reponse.status}` };
    }

    return { ok: true, status: reponse.status, body: corps };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}
