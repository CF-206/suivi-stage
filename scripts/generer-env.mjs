/**
 * Génère `src/environments/environment.ts` à partir des variables
 * d'environnement (et du fichier `.env` s'il existe).
 *
 * - En local : tu remplis `.env` (copie de `.env.example`).
 * - Sur Vercel : tu définis les variables dans les settings du projet
 *   (SUPABASE_URL + SUPABASE_ANON_KEY ou SUPABASE_PUBLISHABLE_KEY), le build
 *   les lit automatiquement.
 *
 * Lancer : `node scripts/generer-env.mjs` (fait automatiquement avant
 * `npm start`, `npm run build` et `npm test`).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Lit un fichier `.env` très simple (KEY=VALUE, # commentaires). */
function lireEnvFichier(chemin) {
  if (!existsSync(chemin)) return {};
  const sortie = {};
  for (const ligne of readFileSync(chemin, 'utf8').split(/\r?\n/)) {
    const ligneTrim = ligne.trim();
    if (!ligneTrim || ligneTrim.startsWith('#')) continue;
    const i = ligneTrim.indexOf('=');
    if (i === -1) continue;
    const cle = ligneTrim.slice(0, i).trim();
    let valeur = ligneTrim.slice(i + 1).trim();
    if (
      (valeur.startsWith('"') && valeur.endsWith('"')) ||
      (valeur.startsWith("'") && valeur.endsWith("'"))
    ) {
      valeur = valeur.slice(1, -1);
    }
    sortie[cle] = valeur;
  }
  return sortie;
}

const depuisFichier = lireEnvFichier(resolve(racine, '.env'));
const env = (nom) => process.env[nom] ?? depuisFichier[nom] ?? '';

// Pendant les tests on force le mode local : aucun appel réseau à Supabase.
const estTest = /test/.test(process.env['npm_lifecycle_event'] ?? '');

const supabaseUrl = estTest ? '' : env('SUPABASE_URL');
// La clé publique s'appelle `SUPABASE_ANON_KEY` (ancienne API) ou
// `SUPABASE_PUBLISHABLE_KEY` (nouvelle API Supabase) : on accepte les deux.
const clePublique = estTest
  ? ''
  : env('SUPABASE_ANON_KEY') || env('SUPABASE_PUBLISHABLE_KEY');

const contenu = `// Fichier généré automatiquement par scripts/generer-env.mjs — ne pas modifier à la main.
export const environment = {
  production: ${process.env['NODE_ENV'] === 'production'},
  supabaseUrl: ${JSON.stringify(supabaseUrl)},
  supabaseAnonKey: ${JSON.stringify(clePublique)},
} as const;
`;

const destination = resolve(racine, 'src/environments/environment.ts');
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, contenu, 'utf8');

if (!supabaseUrl || !clePublique) {
  console.log(
    "[suivi-stage] SUPABASE_URL / SUPABASE_ANON_KEY absents : l'app tournera en mode local (localStorage).\n" +
      '              Renseigne-les dans .env (local) ou dans les variables du projet Vercel.',
  );
} else {
  console.log('[suivi-stage] Configuration Supabase chargée.');
}
