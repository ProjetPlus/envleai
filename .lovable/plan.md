# Plan E'nvlé AI — livraison phasée

Le périmètre est trop large pour une seule itération stable. Je livre en 3 phases consécutives sans attendre de validation entre chaque (sauf migration DB qui exige ton clic d'approbation).

## Phase 1 — Fondations (ce tour-ci)

**Marque**
- Nom corrigé partout : « E'nvlé AI » (et non « E'nvlé IA »).
- Logo officiel intégré (fond rendu neutre via traitement transparent).

**Authentification**
- Google OAuth (managé Lovable) + Email/Password.
- Page `/auth` publique, layout `_authenticated` protège le reste.

**Profil utilisateur + onboarding**
- Table `profiles` (nom, âge, métier/secteur, pays, langue, objectifs).
- Modal d'onboarding à la première connexion, données réutilisées comme contexte IA.

**Projets / espaces de travail**
- Table `projects` (nom, description, system prompt projet).
- Table `project_files` + bucket Storage `project-files` (docs, images, vidéos).
- Sidebar : liste projets → chaque projet a ses threads.

**Historique persistant**
- Tables `threads` + `messages` scopées `user_id` + `project_id`, RLS stricte.
- Route `/$projectId/$threadId` ; reload restaure les messages.

**Fixes chat**
- Actions sur chaque message : copier, supprimer, partager, régénérer, éditer (user).
- Bouton « Nouvelle conversation » fonctionnel.
- Génération d'images réparée (modèle `google/gemini-3-flash-image-preview` via gateway, gestion d'erreurs).
- Export PDF / TXT depuis n'importe quelle vue avec nom de fichier auto (`envle-{thread}-{date}`).

## Phase 2 — Recherche web temps réel (tour suivant)

- Connecteur **Firecrawl** activé côté serveur (search + scrape + multi-sources).
- Outil `web_search` exposé au modèle via AI SDK `tools` : il décide quand chercher.
- Pipeline : search → scrape top N → comparaison sources → synthèse citée.
- Adaptation contexte africain via system prompt enrichi.

## Phase 3 — Documents pro + voix (tour suivant)

- **PDF** : jspdf + autotable (déjà installé, mise en page propre + couverture + sommaire).
- **DOCX** : `docx` (titres, listes, tableaux, images).
- **PPTX** : `pptxgenjs` (template, transitions, images IA générées par slide).
- **XLSX** : `exceljs` (formules, mise en forme conditionnelle, graphiques).
- **Voix** : TTS via Lovable AI (`google/gemini-2.5-flash-preview-tts`) — bouton lecture sur chaque message assistant.
- Vidéo : reportée (coût + latence élevés, je préviendrai quand stable).

## Hors périmètre immédiat (à confirmer plus tard)

- Notifications push + tâches en arrière-plan (PWA Service Worker dédié).
- Entraînement IA cross-utilisateurs (nécessite politique de confidentialité explicite + opt-in RGPD avant toute mutualisation de données — je refuserai de l'activer sans ce cadre).
- Génération vidéo.

## Détails techniques

- Stack : TanStack Start + Lovable Cloud (Supabase managé).
- Tous les appels modèles passent par Lovable AI Gateway (`LOVABLE_API_KEY`).
- RLS sur toutes les tables user-scoped (`auth.uid() = user_id`).
- Storage bucket privé `project-files`, policies `auth.uid()`.
- Bearer attacher déjà câblé (`attachSupabaseAuth`).
- La migration DB de phase 1 nécessite ton approbation (un seul clic) avant que je continue avec le code applicatif.
