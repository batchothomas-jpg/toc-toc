# TOC TOC

Jeu de cartes solo installable (PWA), construit avec React, TypeScript et Vite. La logique de partie est indépendante de l’interface et située dans `src/engine.ts`, pour pouvoir être réutilisée plus tard côté serveur autoritaire.

## Démarrer

```sh
npm install
npm run dev
```

## Vérifier

```sh
npm test
npm run build
```

## Déploiement Vercel

Importer le dépôt dans Vercel, conserver la commande de build `npm run build` et le dossier de sortie `dist`. Aucun serveur n’est requis pour jouer en solo. L’architecture de l’engine est isolée afin d’accueillir ultérieurement un serveur multijoueur autoritaire.
