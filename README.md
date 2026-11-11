# Gacha — `gacha-manhwa`

Bannières d'invocation, scène cinématique, Hyperligne 3D (three.js), lobby et boutique d'échange. Tout tirage et tout achat est calculé chez le MJ (`scripts/engine.js`).

La documentation détaillée du module est dans `DOCUMENTATION.md`.

Code de la version **1.25.0** (dernière release), pour Foundry VTT v13.

## Liens avec la suite Manhwa

La suite compte un système (Fiche - Manhwa) et 11 modules. La Fiche est le centre : les données partagées y vivent et les modules les lisent via `globalThis.MANHWA`.

- Utilise la Boutique (objets), les Notifications, et `MANHWA.season`, `pickers`, `attachBack`, `registerMenuTab` (Fiche).
- Règle commune : un module ne plante jamais si un autre est absent (vérifier `game.modules.get(id)?.active` avant d'appeler son API).

## Livraison

1. Augmenter `version` dans `module.json` (jamais deux livraisons au même numéro).
2. Construire le zip, qui doit contenir le dossier `gacha-manhwa/` :
   ```bash
   mkdir -p build/gacha-manhwa && git archive HEAD | tar -x -C build/gacha-manhwa
   cd build && zip -qr gacha-manhwa.zip gacha-manhwa
   ```
3. Créer la release GitHub `vX.Y.Z` avec **exactement 2 fichiers** : `module.json` et `gacha-manhwa.zip`. Le manifeste pointe vers `releases/latest/download/…`.
4. The Forge : Bazaar → *Install From Manifest* avec l'URL versionnée `https://github.com/blendbastien/gacha-manhwa/releases/download/vX.Y.Z/module.json`. Ne jamais utiliser *Update All Packages*.
5. Redémarrer le monde de test, vérifier la version installée et tester.
