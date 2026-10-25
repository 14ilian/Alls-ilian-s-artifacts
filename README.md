# Mes artefacts

Site qui regroupe mes artefacts Claude de 2ᵉ année de pharmacie, rangés par matière : cours expliqués, cartes, fiches, labos interactifs, carnets d'erreurs et outils.

- `index.html` : la page d'accueil (recherche, filtres par matière et par type).
- `a/<nom>/` : une copie de chaque artefact.
- `assets/editor.js` : le bouton « Modifier » présent sur chaque artefact.
- `thumbs/` : les miniatures des cartes de l'accueil.

## Modifier un artefact depuis le site

Ouvre l'artefact, touche **Modifier** en bas à gauche, clique sur un texte entouré, change-le, puis **Enregistrer**. Pour les pages dont le texte est dans leur code (cartes interactives, quiz), utilise **Code de la page**.

La première fois, le site demande une clé GitHub (fine-grained token limité à ce dépôt, permission *Contents : Read and write*). Elle reste dans le navigateur.

Chaque enregistrement crée un commit ; le site en ligne se met à jour en 1 à 2 minutes. Les modifications faites ici vivent dans ce dépôt : une re-synchronisation depuis claude.ai les écraserait.
