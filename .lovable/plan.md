# E'nvlé AI — Feuille de route produit

Cahier des charges reçu = 28 axes. Impossible à livrer en un seul tour sans casser l'app. Voici le découpage en 5 phases livrables et testables, dans l'ordre d'impact utilisateur.

## État actuel (déjà en place)

- Auth email + Google, profils, projets, threads, messages.
- Chat multimodal (texte + images + PDF), historique persistant.
- Recherche web via Firecrawl (auto, sources masquées par défaut).
- Double moteur : Gemini rédige, GPT-5-mini relit.
- Génération d'images (Gemini 3.1 flash image).
- Versions de messages (édition + régénération).
- PWA de base, logo officiel.

## Phase A — Fiabilité + Personnalisation (prochain tour)

1. **Champ nom d'utilisateur** dans profil + onboarding, propagé dans le system prompt (fin des "toi/vous" génériques).
2. **Intelligence temporelle** : injection date/heure/fuseau côté serveur dans chaque appel modèle.
3. **Indicateur de fiabilité** : le modèle tague chaque réponse `[verified] / [estimation] / [opinion] / [creative]` → badge visuel discret sous le message.
4. **Mode strict** (toggle icône bouclier dans composer) : refuse les affirmations sans source web, force citation.
5. **System prompt v2** : ton semi-humain, empathique, proactif, anti-répétition, adapté au niveau utilisateur.

## Phase B — Documents & Voix

6. **Upload universel** : DOCX, XLSX, PPTX, CSV, TXT, audio → extraction serveur (mammoth / xlsx / pptx-parser) puis contexte texte injecté au modèle. Aperçu miniature en bulle.
7. **Transcription audio** : bouton micro → `/v1/audio/transcriptions` (gpt-4o-mini-transcribe), enregistrement WAV côté client.
8. **Export documents pro** :
   - PDF (jspdf + autotable : couverture, TOC, pagination).
   - DOCX (`docx` npm).
   - XLSX (`exceljs` avec formules).
   - PPTX (`pptxgenjs` avec charte).

## Phase C — Sources projet & Mémoire

9. **Fichiers Sources** par projet : bucket storage, jusqu'à 50 fichiers / 1 Go, indexation texte, référencés automatiquement dans les threads du projet.
10. **Mémoire utilisateur** : table `user_memories` (type: temp/project/permanent), UI de gestion (voir/éditer/supprimer/désactiver), injectée dans le system prompt.
11. **Bibliothèque d'assets** : images générées + docs produits classés par projet/thread avec filtres.

## Phase D — Générateurs visuels avancés

12. **Générateur de présentations façon Gamma** : prompt → plan → slides (`pptxgenjs`) avec charte cohérente, exports PPTX + PDF.
13. **Édition d'image avancée** : recadrage réseau social (1:1, 9:16, 16:9, 4:5), extension, inpainting via Gemini 3.1 flash image avec masques.
14. **Infographies / schémas** : génération SVG + Mermaid (diagrammes, orga, mindmap).

## Phase E — Orchestration & performance

15. **Router multi-modèles** : classification rapide de la requête (code / créatif / factuel / long-form) → sélection modèle (GPT-5, Gemini 3 Pro, Gemini flash) au lieu du pipeline fixe actuel.
16. **Streaming SSE** des réponses chat (au lieu du POST bloquant).
17. **Cache** des recherches web (Firecrawl) et des extractions de documents.
18. **Prompt d'installation PWA** premium (dialog centré, détection standalone).

## Hors périmètre immédiat (à valider séparément)

- Workflows / automatisations no-code (§20) → gros chantier UI dédié.
- Apprentissage cross-utilisateurs (§27) → exige politique RGPD + opt-in, refus par défaut.
- Base de connaissances africaine curée (§28) → travail éditorial continu, pas un feature technique livrable en une phase.
- Génération vidéo → coût/latence prohibitifs aujourd'hui.

## Détails techniques

- Stack inchangée : TanStack Start + Lovable Cloud + Lovable AI Gateway.
- Nouveaux serverFn : `analyzeDocument`, `transcribeAudio`, `generatePresentation`, `exportDocument`, `manageMemory`, `routeRequest`.
- Nouvelles tables : `user_memories`, `project_sources`, `generated_assets`.
- Nouveaux buckets : `project-sources` (privé, 1 Go/projet).
- Aucun changement stack, aucune migration destructive.

## Ordre d'exécution proposé

Je démarre **Phase A** immédiatement après ton feu vert sur ce plan. Chaque phase suivante s'enchaîne sans nouvelle validation sauf si une migration DB nécessite ton clic (obligatoire côté Lovable Cloud).