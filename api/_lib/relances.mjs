/**
 * Logique métier des relances, partagée par la serverless function Vercel.
 * (Dossier `_lib` : Vercel ne crée pas de route pour ces fichiers.)
 */

/** Délai avant de relancer une candidature (en jours). */
export const DELAI_RELANCE_JOURS = 7;

/** Formate une date ISO en format français court (jj/mm/aaaa). */
export function formatDate(iso) {
  if (!iso) return 'la date de mon envoi';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Date de référence de la relance : la dernière relance envoyée, sinon la
 * date d'envoi de la candidature.
 */
export function cycleDe(candidature) {
  const data = candidature.data ?? {};
  return data.dateRelance || data.dateDepot || '';
}

/** Nombre de jours écoulés depuis la date de référence. */
export function joursDepuis(cycle) {
  if (!cycle) return null;
  const diff = Date.now() - new Date(cycle).getTime();
  if (Number.isNaN(diff)) return null;
  return Math.floor(diff / 86_400_000);
}

/** Une relance est-elle due ? (statut compatible + 7 jours écoulés) */
export function relanceDue(candidature) {
  const statut = candidature.statut ?? candidature.data?.statut;
  if (!['nouveau', 'postule'].includes(statut)) return false;
  const jours = joursDepuis(cycleDe(candidature));
  return jours !== null && jours >= DELAI_RELANCE_JOURS;
}

/** Formule d'appel adaptée au recruteur ("Bonjour Madame Dupont,"). */
export function formuleAppel(entreprise) {
  const prenom = (entreprise?.contactPrenom ?? '').trim();
  const nom = (entreprise?.contactNom ?? '').trim();
  const civilite = (entreprise?.contactCivilite ?? '').trim();

  if (civilite && nom) return `Bonjour ${civilite} ${nom},`;
  if (civilite && prenom) return `Bonjour ${civilite} ${prenom},`;
  if (prenom && nom) return `Bonjour ${prenom} ${nom},`;
  if (prenom) return `Bonjour ${prenom},`;
  if (nom) return `Bonjour ${nom},`;
  return 'Bonjour,';
}

/**
 * Construit le brouillon de relance (objet + corps) à partir de la fiche.
 * Même logique que l'application, pour que le mail soit prêt à envoyer.
 */
export function construireRelance(candidature) {
  const data = candidature.data ?? {};
  const entreprise = data.entreprise ?? {};
  const candidat = data.candidat ?? {};
  const poste = data.poste || 'votre offre';

  const objet = `Relance – Candidature ${data.poste || 'stage'} – ${entreprise.nom || 'entreprise'}`;

  const contact = [];
  if (candidat.email) contact.push(`cette adresse (${candidat.email})`);
  if (candidat.telephone) contact.push(`le ${candidat.telephone}`);

  const corps = [
    formuleAppel(entreprise),
    '',
    `Je me permets de revenir vers vous suite à ma candidature au poste de ${poste}, envoyée le ${formatDate(data.dateDepot)}, pour laquelle je n'ai pas encore eu de retour de votre part.`,
    '',
    data.lien ? `Ma candidature en ligne : ${data.lien}` : '',
    '',
    contact.length > 0
      ? `Je reste disponible pour un entretien ou pour vous transmettre tout complément d'information. Vous pouvez me joindre via ${contact.join(' ou ')}.`
      : "Je reste disponible pour un entretien ou pour vous transmettre tout complément d'information.",
    '',
    `En vous remerciant de l'attention portée à ma candidature, je vous prie d'agréer, ${candidat.prenom ?? ''} ${candidat.nom ?? ''}, l'expression de mes salutations distinguées.`,
  ]
    .filter((l) => l !== undefined)
    .join('\n');

  return { destinataire: entreprise.email ?? '', objet, corps };
}

/** Construit un lien mailto: avec le brouillon pré-rempli. */
export function mailtoLink(relance) {
  const params = new URLSearchParams({
    subject: relance.objet,
    body: relance.corps,
  });
  return `mailto:${encodeURIComponent(relance.destinataire)}?${params.toString()}`;
}

/** Échappe les caractères HTML. */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Version HTML du mail de relance envoyé AU RECRUTEUR.
 * @param {{objet: string, corps: string, entreprise: object, candidat: object}} parts
 */
export function construireHtmlRelance(parts) {
  const paragraphs = String(parts.corps ?? '')
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');

  const candidat = parts.candidat ?? {};
  const contact = [];
  if (candidat.email) contact.push(candidat.email);
  if (candidat.telephone) contact.push(candidat.telephone);

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(parts.objet)}</title>
</head>
<body style="margin:0;padding:24px;background:#f4f5fb;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#171a2b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e4e7f2;">
    <tr>
      <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:20px 24px;">
        <div style="font-size:15px;font-weight:800;color:#ffffff;">Suivi Stage</div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <h1 style="margin:0 0 18px;font-size:18px;line-height:1.4;">${escapeHtml(parts.objet)}</h1>
        <div style="font-size:15px;line-height:1.65;color:#171a2b;">${paragraphs}</div>
        ${
          contact.length > 0
            ? `<div style="margin-top:22px;padding-top:16px;border-top:1px solid #e4e7f2;font-size:13px;color:#767d95;">
                 ${escapeHtml([candidat.prenom, candidat.nom].filter(Boolean).join(' '))}
                 ${contact.map((c) => `&nbsp;·&nbsp;${escapeHtml(c)}`).join('')}
               </div>`
            : ''
        }
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Construit le sujet du mail. */
export function construireSujet(relances) {
  if (relances.length === 1) {
    const e = relances[0].data?.entreprise?.nom || 'ton candidature';
    return `🔔 Relance à faire — ${e}`;
  }
  return `🔔 ${relances.length} relances à faire`;
}

/** Version texte brut du mail. */
export function construireTexte(relances, appUrl) {
  const lignes = [
    'Tes relances sont à faire :',
    '',
  ];

  for (const c of relances) {
    const data = c.data ?? {};
    const e = data.entreprise ?? {};
    const jours = joursDepuis(cycleDe(c));
    lignes.push(
      `• ${e.nom || 'Entreprise'} — ${data.poste || 'candidature'}` +
        (jours !== null ? ` (${jours} jours depuis le dernier envoi)` : ''),
    );
    lignes.push(`  ${appUrl}/candidatures/${c.id}`);
    if (e.email) {
      const relance = construireRelance(c);
      lignes.push(`  Relancer par mail : ${mailtoLink(relance)}`);
    }
    lignes.push('');
  }

  lignes.push('—', 'Suivi Stage');
  return lignes.join('\n');
}

/** Version HTML du mail (styles inline : compatible avec tous les clients mail). */
export function construireHtml(relances, appUrl) {
  const cartes = relances
    .map((c) => {
      const data = c.data ?? {};
      const e = data.entreprise ?? {};
      const jours = joursDepuis(cycleDe(c));
      const lienFiche = `${appUrl}/candidatures/${c.id}`;

      const boutonMail = e.email
        ? `<a href="${mailtoLink(construireRelance(c))}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#f1f5f9;color:#4f46e5;text-decoration:none;font-weight:600;font-size:13px;">✉️ Relancer par mail</a>`
        : '';

      return `
      <tr>
        <td style="padding:16px;border-bottom:1px solid #e4e7f2;">
          <div style="font-size:16px;font-weight:700;color:#171a2b;margin-bottom:4px;">${escapeHtml(
            e.nom || 'Entreprise',
          )}</div>
          <div style="font-size:14px;color:#4a5068;margin-bottom:8px;">${escapeHtml(
            data.poste || 'Candidature',
          )}</div>
          <div style="font-size:13px;color:#767d95;margin-bottom:12px;">${
            jours !== null
              ? `⏳ ${jours} jour${jours > 1 ? 's' : ''} depuis le dernier envoi`
              : '⏳ Relance à faire'
          }</div>
          <a href="${lienFiche}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:13px;margin-right:8px;">Préparer la relance</a>
          ${boutonMail}
        </td>
      </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relances à faire</title>
</head>
<body style="margin:0;padding:24px;background:#f4f5fb;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#171a2b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e4e7f2;overflow:hidden;">
    <tr>
      <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 24px;">
        <div style="font-size:20px;font-weight:800;color:#ffffff;margin-bottom:6px;">🔔 Suivi Stage</div>
        <div style="font-size:14px;color:rgba(255,255,255,0.85);">${
          relances.length === 1
            ? 'Une relance est à faire'
            : `${relances.length} relances sont à faire`
        }</div>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 8px 4px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${cartes}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 24px 28px;">
        <a href="${appUrl}/relances" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">Ouvrir Suivi Stage</a>
        <div style="margin-top:18px;font-size:12px;color:#767d95;">
          Tu as reçu cet email parce qu'une relance est arrivée à échéance.<br>
          Tu peux changer ou désactiver cette option dans les réglages de ton compte.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
