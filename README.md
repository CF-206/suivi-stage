# Suivi Stage

Application web de suivi de candidatures de stage (offres + candidatures
spontanées), avec :

- une **synchronisation Supabase** (multi-utilisateur, email + mot de passe) ;
- un déploiement **Vercel** en une commande (ou via l'interface Vercel) ;
- un **mode local** de repli : sans configuration Supabase, tout reste dans le
  `localStorage` du navigateur.

---

## Démarrage rapide

```bash
npm install
npm start          # http://localhost:4200
npm run build      # build de production -> dist/suivi-stage/browser
npm test           # tests unitaires (vitest)
```

Sans configuration, l'app démarre en **mode local** (données dans le
navigateur). Pour activer Supabase, voir la section suivante.

---

## 1. Configuration Supabase

### a. Créer le projet

1. [supabase.com](https://supabase.com) → nouveau projet.
2. Dans **Project Settings → API**, note :
   - l'**URL** du projet (`https://xxxx.supabase.co`) ;
   - la clé **`anon` / publishable**.
3. Dans **Project Settings → Authentication → Providers → Email** :
   - garde l'authentification par email activée ;
   - pour un usage perso sans friction, tu peux désactiver
     *Confirm email* (sinon il faut confirmer l'email avant la 1re connexion).

### b. Créer les tables

Dans le **SQL Editor** de Supabase, colle et exécute le script
[`supabase/schema.sql`](supabase/schema.sql) : il crée les tables
`candidatures` et `profils`, active la **Row Level Security** (chaque
utilisateur ne voit que ses lignes) et les policies.

Les **offres** et les **candidatures spontanées** sont stockées dans la même
table `candidatures` : la colonne `origine` (`'offre'` / `'spontanee'`)
distingue les deux types, et la fiche complète est conservée en JSONB dans
la colonne `data`.

### c. Renseigner les clés

En local, copie `.env.example` en `.env` puis remplis :

```env
SUPABASE_URL=https://ton-projet.supabase.co
SUPABASE_ANON_KEY=ta-cle-anon-publique
SUPABASE_VAPID_PUBLIC_KEY=ta-cle-vapid-publique   # Web Push (optionnel)
```

Le fichier `.env` est ignoré par git. `scripts/generer-env.mjs` (lancé
automatiquement avant `npm start`, `npm run build` et `npm test`) génère
`src/environments/environment.ts` à partir de ces variables.

> ⚠️ Ne mets **jamais** la clé `service_role` dans l'app : elle contourne la
> RLS. Seule la clé `anon` est utilisée ici.

### d. Premier lancement

- L'app affiche la page **Connexion**.
- Crée un compte (email + mot de passe) : les données déjà saisies en mode
  local sont automatiquement **migrées** vers ton compte à la première
  connexion.
- Les candidatures et ton profil sont désormais **synchronisés** : tu peux
  changer de navigateur ou d'appareil, tu retrouves tout.

---

## 2. Déploiement sur Vercel

Le dépôt contient déjà [`vercel.json`](vercel.json) (build + réécriture SPA
pour que le routing Angular fonctionne en navigation directe).

### Option A — depuis le CLI

```bash
npm i -g vercel
vercel            # premier déploiement (previews)
vercel --prod     # déploiement en production
```

### Option B — depuis l'interface Vercel

1. Importe le dépôt GitHub sur Vercel.
2. Vercel détecte Angular : **Framework Preset = Angular**.
3. **Environment Variables** → ajoute :
   - `SUPABASE_URL` = l'URL de ton projet ;
   - `SUPABASE_ANON_KEY` = ta clé anon.
4. Déploie. Le build utilise `npm run build` et publie
   `dist/suivi-stage/browser`.

> Si Vercel ne détecte pas le framework, force :
> **Build Command** = `npm run build`, **Output Directory** =
> `dist/suivi-stage/browser`.

---

## 2.5 Notifications (relances)

L'app utilise l'**API Notification du navigateur** (aucune infrastructure
serveur, aucun service worker) :

- une bannière en haut de l'écran propose d'activer les notifications ;
- dès qu'une relance devient due, une notification apparaît ;
- le contrôle est **immédiat** : il se déclenche à chaque changement de la
  liste (chargement Supabase, ajout, modification) + un minuteur de sécurité ;
- une seule notification par candidature et par cycle de relance (mémorisé
  dans le `localStorage`, scopé par utilisateur) ;
- la notification reste affichée jusqu'au clic (`requireInteraction`).

> ⚠️ Les notifications navigateur ne fonctionnent que tant que l'application
> est ouverte dans un onglet. Pour être prévenu même en la fermant, il faut
> un canal externe (email, Telegram…) — voir la Roadmap.

### Alerte : quand se déclenche-t-elle ?

```
relance due  ⇔  statut ∈ {nouveau, postulé}
             ET  (date de la dernière relance, sinon date d'envoi) ≥ 7 jours
```

La **date limite de l'offre** n'est pas une alerte : c'est seulement une
étiquette orange sur la carte.

---

## 3. Où sont stockées les données ?

| Situation | Stockage |
|---|---|
| Connecté (compte Supabase) | **Supabase** = source de vérité. Tout est lu/écrit en base. |
| Hors-ligne (réseau coupé) | Cache `localStorage` + file d'attente des modifications à envoyer |
| Sans configuration Supabase | `localStorage` uniquement (mode local) |

- Au retour du réseau, l'app **renvoie automatiquement** les modifications
  faites hors-ligne, puis recharge les données distantes.
- Un bandeau en haut de l'écran te prévient si la synchronisation est en
  attente ou a échoué.
- À la **première connexion**, les données déjà saisies en mode local sont
  automatiquement rapatriées vers ton compte.
- Les clés de cache local sont scopées par utilisateur : deux comptes sur le
  même navigateur ne se mélangent pas.

## 4. Mode local (sans Supabase)

Si `SUPABASE_URL` / `SUPABASE_ANON_KEY` sont absents :

- l'app fonctionne normalement, **sans compte ni mot de passe** ;
- les données sont stockées dans le `localStorage` du navigateur ;
- l'en-tête affiche « Mode local ».

C'est pratique pour tester l'app, mais les données ne sont plus partagées
entre appareils.

---

## Structure

```
src/app/
├── app.ts                 # racine (router-outlet)
├── app.routes.ts          # routes (/connexion + layout Shell + lazy loading)
├── core/
│   ├── data/exemple.ts    # la candidature d'exemple + le profil exemple
│   ├── guards/            # authGuard / guestGuard
│   ├── models/            # info, entreprise, profil, candidature
│   ├── services/          # storage, cloud (Supabase), auth, notification…
│   └── utils/             # validators, info-form, relance, date
├── layout/shell/          # topbar + nav + watcher de notifications
├── shared/components/     # info-form, completion-bar
└── features/
    ├── auth/              # page Connexion / Inscription
    ├── profil/            # page "Mes infos" (moi)
    ├── relances/          # page "Relances" (à faire / en cours)
    ├── archives/          # page "Archivées"
    └── candidatures/      # list (cartes), card, detail, form, relance-form

supabase/schema.sql        # tables + RLS + policies (à exécuter une fois)
scripts/generer-env.mjs   # génère src/environments/environment.ts
vercel.json                # config de déploiement Vercel
```

---

## Fonctionnalités

- **Deux sections** sur la page liste :
  - **Offres** — cartes des candidatures qui répondent à une offre
  - **Candidatures spontanées** — cartes **en dessous**, avec les infos que tu
    fournis toi : nom de l'entreprise *(obligatoire)*, email de recrutement,
    téléphone, LinkedIn
- **Statuts** : `Nouveau` · `Postulé` · `Refusé` · `Archivé` (offre fermée)
- **Les archivées sont à part** : elles n'apparaissent pas dans la liste
  principale, mais dans l'onglet **📦 Archivée** (bouton dans le header, avec
  le compteur). Depuis cet onglet, on peut les remettre dans le circuit ou
  les supprimer
- **Fiche détaillée** : panneaux **L'entreprise**, **Le recruteur**,
  **L'offre/Ma candidature**, **Moi** (signature de la relance) + mail source
- **Contact recruteur** (optionnel, pour les offres ET les spontanées) :
  civilité, prénom et nom de la personne en charge du recrutement. Ils sont
  utilisés automatiquement dans la formule d'appel du mail de relance
  (« Bonjour Madame Delcourt, »)
- **Relance hebdomadaire** : l'indicateur 🔔 se recalcule **depuis la dernière
  relance** (7 jours). Cliquer l'indicateur ouvre le brouillon (destinataire =
  email de l'entreprise, objet, corps signé avec mon nom/email/tel) avec deux
  boutons : **Copier le message** et **Ouvrir dans Outlook** (`mailto:`)
- **Notifications** : l'app vérifie toutes les minutes et prévient quand une
  relance devient à faire (une seule fois par candidature, re-notifié au
  cycle suivant). Page **Relances** + cloche dans le header
- **Compte utilisateur** : inscription / connexion par email, synchronisation
  des données entre appareils, bouton **Déconnexion** dans l'en-tête
- **L'app démarre avec 1 exemple** : une candidature complète (Capgemini) et un
  profil exemple, pour illustrer le remplissage. Bouton `💡 Exemple` pour la
  réafficher, `Supprimer` sur la fiche pour l'enlever

## Roadmap

- [x] Squelette Angular + routing + layout
- [x] Vue en cartes + filtres
- [x] Infos entreprise + recruteur + mes infos + complétion
- [x] Ajout / édition de candidature (offre et spontanée)
- [x] Générateur de relance hebdomadaire (copie / ouverture Outlook)
- [x] Notifications navigateur + page Relances
- [x] Authentification Supabase + synchronisation multi-utilisateur
- [x] Déploiement Vercel (SPA routing + variables d'environnement)
- [ ] Export CSV des candidatures
- [ ] Statistiques (nb candidatures / envois, taux de réponse)
