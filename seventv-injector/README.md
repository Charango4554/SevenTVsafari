# `seventv-injector`

Runtime injecte de type BetterTTV pour 7TV.

Le projet produit :
- `dist/seventv.js`
- `dist/seventv.css`
- `loader/userscript.js`

Le runtime est autonome :
- pas de dépendance au frontend Svelte 7TV
- pas de dépendance au backend Rust au runtime
- bootstrap modulaire pour Twitch et YouTube

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev
```

Cette commande reconstruit le bundle en continu dans `dist/`.

## Build

```bash
npm run build
```

Build de sortie :
- `dist/seventv.js`
- `dist/seventv.css`

## Lint

```bash
npm run lint
```

## Charger le script

1. Builder le projet.
2. Héberger `dist/seventv.js` et `dist/seventv.css` sur le même répertoire HTTP.
3. Ouvrir `loader/userscript.js`.
4. Remplacer l’URL CDN par celle qui héberge `seventv.js`.
5. Installer le userscript dans Tampermonkey.

Le runtime charge `seventv.css` automatiquement à partir de l’URL du script injecté.

## Structure

```text
src/
  index.ts              bootstrap
  settings.ts           settings locales et migrations
  storage.ts            persistance localStorage
  watcher.ts            bus d’événements métier
  observers/            DOM + navigation SPA
  platforms/            adaptateurs Twitch / YouTube
  modules/              fonctionnalités chargeables
  utils/                réseau, debug, helpers runtime
```

## Notes

- Le projet vise d’abord Safari via userscript.
- Le support Twitch / YouTube est volontairement modulaire.
- Les modules inclus sont une base de runtime injectable, pas une reprise du site 7TV.
