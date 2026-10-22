/**
 * Suivi Stage — envoi automatique des relances par email (Mailjet).
 *
 * Déclenchée par Vercel Cron (voir `crons` dans vercel.json) une fois par jour.
 * Elle peut aussi être appelée manuellement :
 *   GET  https://<ton-app>.vercel.app/api/envoyer-relances
 *
 * Runtime : Node.js (signature Vercel classique `handler(req, res)`).
 *
 * Variables d'environnement (Settings > Environment Variables sur Vercel) :
 *   MAILJET_API_KEY        clé publique Mailjet
 *   MAILJET_API_SECRET     clé privée Mailjet
 *   MAILJET_FROM_EMAIL     adresse expéditeur (doit être vérifiée dans Mailjet)
 *   MAILJET_FROM_NAME      nom de l'expéditeur (optionnel)
 *   SUPABASE_URL           URL du projet Supabase
 *   SUPABASE_SERVICE_ROLE_KEY  clé service_role (contourne la RLS, côté serveur uniquement)
 *   APP_URL                URL publique de l'application
 *   CRON_SECRET            (optionnel) protège l'endpoint si appelé manuellement
 */

import { envoyerEmail } from './_lib/mailjet.mjs';
import { choisirIdentifiants, identifiantsApplication } from './_lib/mailjet-config.mjs';
import {
  construireHtml,
  construireSujet,
  construireTexte,
  cycleDe,
  relanceDue,
} from './_lib/relances.mjs';

const DELAI_RELANCE_JOURS = 7;

/** Appel REST à Supabase (PostgREST). */
async function supabase(url, cle, chemin, options = {}) {
  const reponse = await fetch(`${url}/rest/v1/${chemin}`, {
    ...options,
    headers: {
      apikey: cle,
      Authorization: `Bearer ${cle}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const texte = await reponse.text();
  let corps = texte;
  try {
    corps = JSON.parse(texte);
  } catch {
    /* on garde le texte brut */
  }
  if (!reponse.ok) {
    throw new Error(`Supabase ${reponse.status} sur ${chemin} : ${texte.slice(0, 300)}`);
  }
  return corps;
}

/** Liste les emails des utilisateurs (API d'administration Supabase). */
async function emailsUtilisateurs(url, cle) {
  try {
    const reponse = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, {
      headers: { apikey: cle, Authorization: `Bearer ${cle}` },
    });
    if (!reponse.ok) return new Map();
    const data = await reponse.json();
    const map = new Map();
    for (const u of data.users ?? []) {
      if (u?.id && u?.email) map.set(u.id, u.email);
    }
    return map;
  } catch {
    return new Map();
  }
}

/** Repli : email du profil renseigné dans l'application. */
async function emailsProfils(url, cle) {
  const map = new Map();
  try {
    const profils = await supabase(url, cle, 'profils?select=user_id,data');
    for (const p of profils ?? []) {
      const email = p.data?.email;
      if (email) map.set(p.user_id, email);
    }
  } catch {
    /* sans importance */
  }
  return map;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const repondre = (statut, corps) => res.status(statut).json(corps);

  try {
    // --- Sécurité : si CRON_SECRET est défini, on l'exige -----------------
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const autorisation = req.headers.authorization ?? '';
      if (autorisation !== `Bearer ${secret}`) {
        return repondre(401, {
          error: 'Non autorisé',
          astuce:
            "Ajoute l'en-tête 'Authorization: Bearer <CRON_SECRET>', ou retire CRON_SECRET des variables.",
        });
      }
    }

    // --- Configuration ----------------------------------------------------
    const url = process.env.SUPABASE_URL;
    const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const appUrl = (process.env.APP_URL ?? '').replace(/\/$/, '');

    const manquantes = [];
    if (!url) manquantes.push('SUPABASE_URL');
    if (!cle) manquantes.push('SUPABASE_SERVICE_ROLE_KEY');
    // Les identifiants Mailjet ne sont pas obligatoires ici : chaque
    // utilisateur peut avoir le sien (table `mailjet_credentials`).
    if (!process.env.MAILJET_API_KEY && !process.env.MAILJET_API_SECRET) {
      manquantes.push('MAILJET_API_KEY (ou comptes Mailjet personnels)');
    }
    if (!process.env.MAILJET_FROM_EMAIL && !process.env.MAILJET_API_KEY) {
      manquantes.push('MAILJET_FROM_EMAIL');
    }
    if (!appUrl) manquantes.push('APP_URL');

    if (manquantes.length > 0) {
      return repondre(500, {
        error: 'Configuration incomplète',
        variablesManquantes: manquantes,
      });
    }

    // --- Candidatures dont la relance est due ------------------------------
    let candidatures;
    try {
      candidatures = await supabase(
        url,
        cle,
        'candidatures?select=id,user_id,statut,data&statut=in.(nouveau,postule)',
      );
    } catch (e) {
      return repondre(500, { error: e instanceof Error ? e.message : String(e) });
    }

    const dues = (candidatures ?? []).filter((c) => relanceDue(c));

    if (dues.length === 0) {
      return repondre(200, {
        message: 'Aucune relance due.',
        delaiJours: DELAI_RELANCE_JOURS,
        emailsEnvoyes: 0,
      });
    }

    // --- Relances déjà notifiées ------------------------------------------
    let dejaEnvoye = new Set();
    try {
      const lignes = await supabase(url, cle, 'relances_envoyees?select=candidature_id,cycle');
      for (const l of lignes ?? []) dejaEnvoye.add(`${l.candidature_id}|${l.cycle}`);
    } catch {
      /* si la table n'existe pas, on enverra */
    }

    const aNotifier = dues.filter((c) => !dejaEnvoye.has(`${c.id}|${cycleDe(c)}`));

    if (aNotifier.length === 0) {
      return repondre(200, {
        message: 'Relances déjà notifiées (aucun nouvel envoi).',
        relancesDues: dues.length,
        emailsEnvoyes: 0,
      });
    }

    // --- Destinataires -----------------------------------------------------
    const [emailsComptes, emailsDepuisProfils] = await Promise.all([
      emailsUtilisateurs(url, cle),
      emailsProfils(url, cle),
    ]);

    // --- Regroupement par utilisateur --------------------------------------
    const parUtilisateur = new Map();
    for (const c of aNotifier) {
      const liste = parUtilisateur.get(c.user_id) ?? [];
      liste.push(c);
      parUtilisateur.set(c.user_id, liste);
    }

    const resultats = [];
    let envoyes = 0;
    let erreurs = 0;

    for (const [userId, relances] of parUtilisateur) {
      const destinataire = emailsComptes.get(userId) ?? emailsDepuisProfils.get(userId);

      if (!destinataire) {
        resultats.push({
          user_id: userId,
          statut: 'ignore',
          motif: 'Aucun email connu pour cet utilisateur',
        });
        continue;
      }

      // Compte Mailjet personnel de l'utilisateur s'il en a un, sinon celui
      // de l'application.
      const identifiants = await choisirIdentifiants(url, cle, undefined, userId);
      const config =
        identifiants.apiKey && identifiants.apiSecret
          ? identifiants
          : identifiantsApplication();

      const reponse = await envoyerEmail(
        {
          to: destinataire,
          toName: '',
          subject: construireSujet(relances),
          text: construireTexte(relances, appUrl),
          html: construireHtml(relances, appUrl),
        },
        config,
      );

      if (reponse.ok) {
        envoyes++;
        resultats.push({
          user_id: userId,
          email: destinataire,
          statut: 'envoye',
          relances: relances.length,
        });
      } else {
        erreurs++;
        resultats.push({
          user_id: userId,
          email: destinataire,
          statut: 'erreur',
          relances: relances.length,
          erreur: reponse.error,
          detail: reponse.body,
        });
      }
    }

    // --- Mémorisation (évite les doublons) ---------------------------------
    if (envoyes > 0) {
      try {
        await supabase(url, cle, 'relances_envoyees', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(
            aNotifier.map((c) => ({ candidature_id: c.id, cycle: cycleDe(c) })),
          ),
        });
      } catch (e) {
        resultats.push({
          statut: 'avertissement',
          motif: `Envoi réussi mais mémorisation impossible : ${
            e instanceof Error ? e.message : String(e)
          }`,
        });
      }
    }

    return repondre(erreurs > 0 ? 207 : 200, {
      message: `${envoyes} email(s) envoyé(s), ${erreurs} erreur(s).`,
      relancesDues: dues.length,
      relancesNotifiees: aNotifier.length,
      emailsEnvoyes: envoyes,
      erreurs,
      detail: resultats,
    });
  } catch (e) {
    return repondre(500, {
      error: 'Erreur inattendue',
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
