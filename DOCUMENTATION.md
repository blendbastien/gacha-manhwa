# Gacha Manhwa — Appel des Étoiles 1.14.0

Module d'invocations façon gacha pour **Manhwa Sheet** (Foundry v13), inspiré de Honkai: Star Rail.

**Manifeste :** `https://github.com/blendbastien/gacha-manhwa/releases/latest/download/module.json`


## 1.21.1
- Correctif : la Boutique stellaire ne s'ouvrait plus (« vis is not a function »).

## 1.21.0
- Boutique stellaire : cartes au visuel du Catalogue (icône 2D, fond de catégorie, halo selon le rang), badge de rang hexagonal, bandeau de rareté.
- Icône des sections : grille d'icônes et images personnelles (bouton « + »).
- Mode édition : section en carte, boutons colorés, prix / monnaie / limite / renouvellement modifiables sur chaque carte.
- Recherche d'objets : sélecteur visuel du Catalogue.
- Bannières : icônes 2D partout ; blocs de la Boutique qui remplissent une bannière (la bannière suit le bloc).

## 1.19.1

Couleurs des boutons ×1 (bleu cristal) et « Obtenir » (or) ; médaillons sans reste de l'ancienne plaque ; marges de la Boutique.

## 1.19.0

- Appel des Étoiles et Boutique stellaire en **plein écran** (avec Manhwa Sheet ≥ 1.29) : grosse flèche néon pour revenir, réduire en barre, quitter (retour au Menu si on en venait).
- **Boutons 3D iso** éclairés (la lumière suit la souris), adaptables à la taille de l'écran ; Infos / Historique / Boutique en **médaillons dorés animés** ; titre de bannière en relief doré qui tient toujours en entier ; ruban 3D « Synthèse permanente / limitée ».
- Boutique stellaire : sections en médaillons, onglets 3D, cartes adaptables, **chargement beaucoup plus rapide** (index du Catalogue gardé en mémoire au lieu d'une copie complète par objet, cartes hors écran non dessinées).
- Catalogue depuis le Menu : le Menu ne se rouvre plus derrière.

## Ce que fait le module

- **Page d'invocation** : liste des bannières à gauche, grande illustration, panneau d'informations, objets à l'affiche, compte à rebours, boutons ×1 / ×10 avec leur coût, portefeuille du personnage (Gold, tickets, fragments). Musique d'ambiance.
- **Bannières très personnalisables** (éditeur du MJ) :
  - 4 emplacements d'images (fond, illustration, vignette, logo), position et taille de l'illustration, couleurs, étiquette, titre, sous-titre, texte d'ambiance ;
  - lots tirés du **Catalogue** (types, rangs, catégories, mondes) et/ou ajoutés à la main, exclusions, objets **à l'affiche** avec leur chance (50/50 façon HSR) et une garantie après échec (désactivée par défaut) ;
  - **taux par rang** (F → SSS) réglables ; par défaut 42 / 30 / 15 / 9 / 2,5 / 1 / 0,35 / 0,12 / 0,03 % ;
  - **coût** en Gold (×1 et ×10) et **tickets** acceptés (objet du Catalogue, nom exact ou objet marqué) ;
  - **pitié** douce et dure, **minimum garanti sur 10 tirages**, groupe de compteurs partagé — tout désactivé par défaut ;
  - début, fin, **saison** du Catalogue, bannière permanente ou limitée.
- **Tirages calculés chez le MJ** (aucune triche possible) : paiement, objets créés sur la fiche, compteurs.
- **Doublons → fragments** (deux sortes : rangs bas / rangs élevés, noms et valeurs réglables), ou ajout à la pile pour les consommables.
- **Scène cinématique** plein écran, avec sons et vidéos synchronisés : charge, pluie de météores, météore dont la couleur annonce le meilleur rang, portail, puis chaque objet révélé.
  - Commun : carte qui se retourne. A / B : éclat violet.
  - **S** : obscurité, lumière qui converge, frappe orchestrale, éclair, badge qui s'abat.
  - **SS** : noir total, fissures de feu, silhouette, double onde de choc, aberration chromatique.
  - **SSS** : silence, une étoile, une entaille de lumière, rayons prismatiques, portail blanc, explosion arc-en-ciel, contour irisé, titre « Objet de rang SSS ».
  - Écran de résultats en diagonale, « Nouveau » / doublon et fragments gagnés, « Invoquer encore ».
- **Salle d'invocation (lobby)** : avant un tirage, le lanceur ouvre une salle ; les autres joueurs la rejoignent (automatiquement, sur invitation, ou jamais — réglage de chacun). Leurs avatars ronds s'affichent en bas à gauche, avec un liseré et un emblème selon le lien (Groupe, Ami, Communauté). Le lanceur choisit qui peut entrer : tout le monde, son groupe et ses amis, validation un par un, ou personne. Compte à rebours avec lancement automatique (réglable, 0 = manuel), puis départ **synchronisé** de la scène pour tous (heure du serveur).
- **Chat** : carte récapitulative. **Grande annonce** au centre de l'écran (module Notifications Manhwa) pour les objets dont le taux est sous un seuil.
- **Historique** : un onglet par joueur, visible par tous, filtrable par bannière.
- **Échange** : boutique façon HSR (sections, grille de cartes, prix en fragments ou en Gold, limites par personnage), modifiable par le MJ.
- **Menu Manhwa** : onglet « Invocation » (Invocation, Échange, Historique, bannières ouvertes). Aussi : bouton dans les contrôles des jetons, réglages du module, API.

## Sons, vidéos et images

Ils ne sont pas dans ce dépôt (droits des auteurs). Dépose le pack d'assets (dossiers `snd/`, `vid/`, `img/` et `3d/`) dans ta bibliothèque de fichiers, par exemple `gacha-manhwa-assets/`, puis indique ce dossier dans les réglages (Éditeur › Réglages généraux › Vérifier). Sans pack, la scène fonctionne en silence avec ses effets dessinés et les icônes de base.

## Bibliothèque tierce

`vendor/three-bundle.js` : three.js r160 (licence MIT, voir `vendor/LICENSE-three.txt`), regroupé avec ses modules de post-traitement.

## API

`game.modules.get("gacha-manhwa").api` : `open()`, `shop()`, `history()`, `editor()`, `demo("SSS")`, `pull(bannerId, actorId, 1|10)`.

## Historique

- **1.18.0** : **solidité quand joueurs et MJ agissent en même temps**. Synthèse, achat en Boutique stellaire, déconstruction, tickets et portefeuille tournent sous le verrou du personnage, partagé avec Manhwa Sheet, le Catalogue et les Véhicules : l'or ou l'inventaire d'un personnage n'est touché que par une opération à la fois, tous modules confondus. Si la création des objets échoue après le paiement, le paiement est rendu (or recrédité, tickets recréés) — avant, le joueur payait dans le vide. Le MJ rejette les requêtes en double (double envoi) et les requêtes forgées (expéditeur inconnu ou se disant MJ).
- **1.17.1** : **éditeur plus fluide, aperçu du tram, garde-fous**.
  - Apparence : les aperçus (page de la bannière, planète, train) passent sur le côté ; la planète est une image fixe (plus d'animation 3D qui tourne pendant la saisie) ; la saisie ne redessine l'aperçu qu'après une courte pause.
  - Aperçu du tram avec son habillage (onglet Apparence) et aperçu en direct des « Couleurs du tram » (Réglages).
  - Carte de révélation : l'image de l'objet passe devant le cadre décoratif.
  - Garde-fous : jamais deux synthèses enchaînées sans un vrai clic (refus pendant une scène et sous 1,2 s), boutons « Synthétiser » des résultats désactivés après le clic, Entrée / Espace ne déclenchent plus un bouton resté focalisé derrière la scène.
- **1.17.0** : **couleurs du tram et icônes nettes**.
  - Éditeur › Réglages › « Couleurs du tram » : suivre l'habillage (saison, événement) ou couleurs personnalisées — carrosserie (+ intensité), liserés, phares et intérieur, vitres, givre ; bouton « Couleurs par défaut ». Les habillages de saison teintent aussi le vrai tram (carrosserie, liserés de ceinture et de toit, phares, givre en hiver).
  - Reflets du tram adoucis (carrosserie moins miroir, vitres moins brillantes) ; matériaux propres à chaque synthèse.
  - Icônes haute définition : les 93 icônes du pack `armure2` existent en ×4 (`catalogue-icones/armure2-hd-x4`) ; réglage « Icônes haute définition » sur ×4 par défaut.
- **1.16.2** : réglage du monde « Icônes haute définition (essai) » : Non / ×2 / ×3 / ×4 — utilise les icônes agrandies (dossiers `catalogue-icones/armure2-hd-x2|x3|x4` + `list.json`) quand elles existent ; à « Non », rien ne change.
- **1.16.1** : **tram sans fin et coup sec plus fort**.
  - Le tram ne s'arrête plus à droite : la deuxième voiture perd son nez arrière et se répète (6 voitures, attelages compris) ; on n'en voit jamais le bout.
  - La porte choisie est celle du milieu de la première voiture ; elle s'allume (liseré + emblème) dès le ralentissement, la caméra se centre dessus avant de foncer.
  - Coup sec : petit recul d'élan, ruée en grand angle avec flou radial vers la porte, impact (secousse, aberration, éclair à la couleur du rang, bloom) et souffle sonore.
- **1.16.0** : **le vrai tram dans l'ouverture 3D**.
  - Le pack peut contenir un tram en 3D (`3d/tram.glb`, environ 6 Mo) et un éclairage de ville de nuit (`3d/night.hdr`) : ils remplacent le train dessiné. Chargés une seule fois par session (préchargés à l'ouverture du Synthétiseur ou de la Salle de Synthèse), puis réutilisés.
  - Le tram file sur la voie entre les piliers (la caméra le prend en chasse d'un panoramique filé), freine dans les étincelles, puis la caméra se cale d'un coup sec au pied d'une porte, en contre-plongée.
  - Les deux vrais battants sortent puis coulissent le long de la caisse ; l'embrasure révèle le couloir de lumière à la couleur du rang, avant l'éblouissement.
  - Phares et intérieur des voitures prennent la couleur du rang dans le couloir et pulsent pendant le freinage (arc-en-ciel en SSS, fausse alerte comprise).
  - Réglage client « Tram détaillé dans l'ouverture 3D » (décocher sur un ordinateur modeste) ; sans tram dans le pack, ou s'il tarde à charger, le train photo ou dessiné prend le relais automatiquement.
  - Diagnostic : nouvelle ligne « Tram 3D ».
- **1.15.0** : **refonte visuelle et difficulté**.
  - Musique : les musiques d'appel bouclent sur leur partie douce (plus jamais de retour au début intense) ; l'écran de fin bascule sur cette partie douce.
  - Accueil : vitrine « À gagner » (objets du Catalogue avec leur illustration), taux affichés, garantie (« rang E garanti au 20e tirage »), libellés courts sous les boutons (Infos, Historique, Boutique), vignette de secours (illustration ou objet de la vitrine).
  - Difficulté : taux par défaut bien plus durs, **rang garanti réglable** (pitié sur E, D… pas seulement S), **préréglages** (Départ : F + un peu de E, E garanti au 20e ; Standard difficile ; Limitée).
  - Éditeur : choix d'objets dans le Catalogue par type / catégorie / rang / nom, avec images et « Tout cocher » ; **Vitrine de la bannière** (objets montrés sur la page et toujours dans la bannière).
  - Voyage : portiques et piliers qui défilent plus vite (la planète reste visible), aberration chromatique réduite, **approche de la porte d'un coup sec en contre-plongée**, lumière qui filtre par la fente, **intérieur de porte** (couloir de lumière), fondu au blanc vers la première carte.
  - Cartes : illustrations du Catalogue, rayons et anneau de runes à la couleur du rang, **reflet holographique** et inclinaison 3D à la souris (rang A et plus), dos de carte opaque avec reflet, traits de lumière nets (fin de la vidéo d'explosion floue), ambiance de saison nette (vrais flocons, pétales…) qui évite le centre.
  - SS / SSS : rang en grand qui s'imprime (bug de taille corrigé), illustration, halo doré net, éclat + secousse, tampon « Nouvelle acquisition ».
  - Résultats : grille droite triée par rang, illustrations, pastille « nouveau », doublons mis en avant, noms plus grands, gain de fragments affiché d'emblée.
- **1.14.0** : réglage « Onglet Catalogue visible pour » avec la barre de recherche de joueurs (Manhwa Sheet 1.24).
- **1.13.0** : **Univers** (éditeur) : 6 galaxies et 10 planètes modifiables (couleurs, anneau, lune, nuages, taille, image perso) avec aperçu 3D ; chaque bannière choisit sa planète, le ciel suit la galaxie de la planète, les bords métalliques de la voie prennent la couleur de la galaxie. **Habillages du train** selon la saison et l'événement de Manhwa Sheet (pétales, feuilles, neige, braises, confettis…), réglage général ou par bannière. **Panneau « Destination »** personnalisable (départ ──► arrivée, galaxie). Passer d'une carte à l'autre montre la carte suivante déjà révélée ; une carte encore cachée est d'abord retournée. **Déconstruction** à la fin : une carte, une sélection ou tout, en fragments, avec avertissement pour les rangs S et plus. Nouveaux insignes de rang (nets au zoom). Objets et bannières d'événement liés à l'événement en cours. Menu : l'Appel des Étoiles reprend son ancienne icône, la Téléportation prend celle aux trois étoiles.
- **1.12.0** : Boutique stellaire : bouton « Ajouter un cosmétique de téléphone » (cadres et effets de message du téléphone de Manhwa Sheet 1.21.0) ; l'achat débloque le cosmétique pour le joueur du personnage, une seule fois, sans créer d'objet.
- **1.11.0** : sons et musiques du gacha joués environ deux fois moins fort (les curseurs gardent leur échelle) ; l'annonce d'un objet de haut rang (module de notifications) part à la fin de la scène du joueur (résultats ou fermeture) au lieu de dévoiler le résultat en pleine animation (filet de sécurité : 2 minutes).
- **1.10.0** : **ouverture beaucoup plus longue** (~12 s) calée sur la musique d'appel : montée et plein régime de l'Hyperligne pendant que la musique monte, freinage, la porte s'allume dans l'accalmie (fausse alerte comprise) et s'ouvre pile sur le grand coup de la musique ; **passer étape par étape** comme dans le jeu : toucher l'écran (ou Espace / Entrée / →) passe l'animation jusqu'à la première carte, puis à la carte suivante ; une carte S, SS ou SSS pas encore retournée se retourne tout de suite (avec sa révélation) au lieu d'être sautée ; « Passer » (ou Échap) va directement à l'écran des résultats pour enchaîner les synthèses ; nom des bannières centré dans les tuiles ; ouvert depuis le Menu, l'Appel des Étoiles, la Boutique et le Catalogue prennent la place du Menu avec un bouton « ‹ Menu » (la Boutique ouverte depuis l'Appel des Étoiles a son bouton « ‹ Appel des Étoiles »).
- **1.9.0** : **fausse alerte de rareté** (réglable, 30 % par défaut) : sur un tirage S, SS ou SSS, la porte s'allume parfois à la couleur d'un rang plus bas, grésille, puis bascule sur la vraie couleur avec un son dédié ; **révélation pleine page** des SS et SSS (grande illustration, rang, nom, rareté, catégorie, citation, Nouveau / Doublon) ; **récapitulatif ×10** : nombre de nouveaux et de doublons, les doublons se changent en fragments qui filent vers le compteur, grille qui tient dans toutes les tailles d'écran ; **jauge de garantie** (tirages faits / garantie, zone où la chance monte) et état du **50/50** ; **panneau de volume** (musique / effets / tout couper) sur la page et pendant la scène ; flashs adoucis ; **Boutique** : limites renouvelées chaque mois (ou chaque semaine, ou jamais) avec le délai affiché, Tickets Orbis contre fragments ; **outils MJ** : offrir des Tickets Orbis (message dans le chat), forcer le résultat de la prochaine synthèse d'un personnage, **rerun** d'une bannière (éditeur) ; option « fausse alerte » dans le test des animations ; **diagnostic** (réglages du module) : pack, fichiers manquants, 3D, son, MJ, versions, écran, rapport à copier ; sons de survol et de clic retirés ; tuile de bannière active qui ne déborde plus ; page, boutique, éditeur et historique utilisables dans une petite fenêtre (barre du bas sur deux lignes, colonnes compactées) ; musique coupée quand la fenêtre est réduite ou l'onglet caché ; mémoire graphique libérée après chaque tirage ; nouvelles icônes du Menu (Appel des Étoiles, Échange, Guilde, Téléportation, Notes, Réglages). Demande Manhwa Sheet 1.17.0.
- **1.8.0** : sons et finitions de l'arrivée en gare. Nouveaux sons : passage du train, freinage et crissement, porte qui s'illumine puis s'ouvre, carte qui fuse, scintillement des révélations S / SS / SSS, musique propre à la Salle de Synthèse, arrivée et départ d'un joueur, tic du décompte (avec pulsation de la salle) et top départ, survol et clic des boutons (réglage client « Sons des boutons »). Porte redessinée : deux battants métalliques qui coulissent dans la caisse, chenillard lumineux autour du cadre, emblème holographique tournant au-dessus, vapeur à l'ouverture, poussières dans le faisceau, reflet anamorphique horizontal, portique de gare à la couleur du rang. Tous les sons sont des fichiers du pack (`snd/`) remplaçables en gardant le même nom.
- **1.7.0** : nouvelle fin de l'Hyperligne façon arrivée en gare : le train fonce, freine dans des gerbes d'étincelles (patins chauffés, secousse, léger recul à l'arrêt), la caméra glisse jusqu'à une porte du premier wagon qui s'illumine à la couleur du meilleur rang, une fente de lumière apparaît, puis la porte s'ouvre et des rayons de cette couleur (arc-en-ciel en SSS) inondent l'écran pour la révélation. La comète est retirée de la version 3D.
- **1.6.0** : l'Hyperligne utilise les visuels du pack quand ils sont présents (dossier `3d/`) : train photo-réaliste vu de profil (passes couleur, reflets balayés par les portiques, néons qui prennent la couleur du meilleur rang) découpé en locomotive + 4 voitures, planète de glace texturée avec sa lune et son atmosphère. Sans ces fichiers, le train et la planète dessinés reprennent la main.
- **1.5.0** : l'Hyperligne passe en **3D** (three.js) : train stellaire à sustentation (coque vernie bleu nuit, liserés or, anneau d'énergie, fenêtres chaudes, propulseurs, phares, sillage) sur une voie suspendue dans l'espace, planète annelée au loin, portiques hexagonaux qui balaient la coque de lumière, piliers de la voie, anneaux d'énergie à la couleur du meilleur rang, comète qui fond sur l'écran ; reflets d'environnement néon, bloom, vignettage, aberration chromatique liée à la vitesse, grain. Réglage client « Ouverture en 3D » (repli 2D automatique si WebGL manque). three.js chargé à l'ouverture du Synthétiseur.
- **1.4.0** : nouvelle ouverture de la synthèse, l'**Hyperligne** — tout défile de gauche à droite de plus en plus vite (étoiles étirées, nébuleuses, rails de lumière), un train stellaire passe en trombe, des portes de lumière stroboscopent, puis la comète de la couleur du meilleur rang frappe le centre ; entièrement dessinée et calée sur les sons. Barres du haut et du bas de l'Appel des Étoiles qui se compactent par paliers dès qu'elles débordent, quelle que soit la taille de la fenêtre. Onglets du Menu regroupés sous « Orbis Astra ». Demande Manhwa Sheet 1.16.0.
- **1.3.0** : nouveau vocabulaire — la page devient l'**Appel des Étoiles** (le Synthétiseur), on **synthétise** au lieu d'invoquer, la Salle de Synthèse remplace la salle d'invocation, l'Échange devient la **Boutique stellaire** ; bannière permanente renommée **Appel au Créateur** ; **Ticket Orbis** et **Ticket Orbis Premium** (émis par Orbis Astra) intégrés au module, acceptés par défaut par les bannières permanentes / limitées et proposés dans la Boutique stellaire ; onglet **Catalogue** dans le Menu Manhwa, visible des joueurs choisis par le MJ ; icônes du pack dans le Menu (réglable) ; la carte se retourne pile sur le **climax** de la musique S / SS / SSS (moment réglable par rang dans l'éditeur) ; retournement de carte fluide (élévation, inclinaison, reflet, pose). Demande Manhwa Sheet 1.15.0.
- **1.2.1** (vérifiée sur la Forge) : la croix et les boutons d'en-tête des fenêtres réapparaissent ; badges de rang dessinés en CSS (visibles aussi dans les boîtes de dialogue) ; plaques et capsules des boutons à la bonne taille (images recadrées) et textes centrés ; titre et boutons de l'écran de résultats lisibles ; plus de barre de défilement dans la liste des bannières ; historique plus sobre ; décompte du lobby lisible. Synchronisation : adresse réelle du pack résolue une fois (plus de redirection d'environ 1 s par fichier sur la Forge), vidéos chargées en mémoire avant la scène, vidéos « garées » à leur point de départ, latence de sortie audio compensée, son en retard recalé sur l'image, révélations S / SS / SSS recalées sur les temps forts des musiques et carte révélée d'un coup sur le coup orchestral.
- **1.2.0** : refonte visuelle avec le pack d'images (dos et cadre des cartes, emblèmes, plaques et capsules des boutons, bandeaux, icônes, fonds par rang, pièces, tickets, fragments) ; 6 nouvelles vidéos d'effets (anneaux, éclat, fumée, paillettes, poussière, rayons) intégrées aux révélations ; salle d'invocation (lobby) avec spectateurs, modes d'acceptation et départ synchronisé ; page d'invocation qui s'adapte à la largeur de sa fenêtre ; sans pack d'images, le module garde ses icônes et styles d'origine.
- **1.1.0** : sons en Web Audio, décodés à l'avance et programmés sur l'horloge audio (synchronisation exacte) ; vidéos aux bords fondus (plus de cadre rectangulaire) ; nouvelles cartes (cadre ornementé, coins filigranés, plaque du nom, ruban Nouveau / doublon) ; effets retravaillés (lueurs, éclats de lumière à la place des fissures) ; boutons polis (médaillon de prix, reflet, halo du ×10) ; titres qui se réduisent pour tenir dans le cadre ; boutons du haut visibles ; éditeur avec aperçu en direct collant, repères des emplacements d'images, illustration à glisser et molette pour la taille ; catégories, sous-catégories et mondes choisis en un clic ; tickets acceptés présentés en cartes, propres à chaque bannière, avec suggestions du Catalogue ; deux onglets dans le Menu de la fiche (Invocation, Échange).

- **1.0.0** : première version.
