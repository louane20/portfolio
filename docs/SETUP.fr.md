# Mise en ligne : guide pas à pas

Ce guide part de ton dépôt existant `louane20/portfolio`. À la fin, le site est publié sur
**https://louane20.github.io/portfolio/** et chaque push sur `main` passe par tout le
pipeline avant d'être déployé.

## 1. Pousser le code

L'archive contient un dépôt Git complet : ton historique (tes 4 commits) suivi des commits de
cette refonte. Le remote `origin` pointe déjà vers ton dépôt.

```sh
unzip portfolio.zip && cd portfolio
git log --oneline          # ton historique, puis la refonte
git push origin main       # simple avance rapide, rien n'est réécrit
```

Si tu préfères repartir de ton clone local : copie tout le contenu de l'archive (y compris les
dossiers cachés `.github/` et les fichiers `.nvmrc`, `.yamllint.yaml`, etc.) par-dessus,
puis `git add -A && git commit && git push`.

## 2. Activer GitHub Pages en mode « GitHub Actions »

*Settings → Pages → Build and deployment → Source : **GitHub Actions***.

C'est l'étape indispensable : l'ancien mode « Deploy from a branch » publierait le code source
au lieu du site construit. Relance ensuite le workflow si besoin :
*Actions → CI/CD → Run workflow*.

## 3. Régler la sécurité du dépôt

*Settings → Advanced Security* (ou *Code security*) :

- active **Dependabot alerts** et **Dependabot security updates** ;
- active **Private vulnerability reporting** (le lien de `SECURITY.md` en dépend) ;
- **n'active pas** le « default setup » de CodeQL : le dépôt utilise sa propre configuration
  (`.github/workflows/codeql.yml`), les deux ne peuvent pas coexister.

Les résultats de Trivy, CodeQL et Scorecard apparaissent dans l'onglet *Security*.

## 4. Protéger `main`

*Settings → Rules → Rulesets → New branch ruleset*, cible `main` :

- *Require status checks to pass* : `Lint`, `Build`, `Test (desktop)`, `Test (mobile)`,
  `Lighthouse`, `Audit` (ils apparaissent dans la liste après le premier run) ;
- *Block force pushes*.

Ça empêche de casser la prod par erreur et ça améliore le score OpenSSF Scorecard.

## 5. Rendre l'image publique

Après le premier run de *Container image*, l'image apparaît dans *Packages*
(`ghcr.io/louane20/portfolio`). Ouvre-la → *Package settings* → *Change visibility* →
**Public**. Sans ça, personne ne peut lancer le `cosign verify` affiché sur le site.

## 6. Finitions

- *About* du dépôt (roue dentée en haut à droite) : mets l'URL du site et des topics
  (`devops`, `kubernetes`, `cilium`, `zero-trust`, `gitops`, `github-actions`, `portfolio`).
- Optionnel, un domaine perso : *Settings → Pages → Custom domain*, puis les enregistrements
  DNS indiqués par GitHub. Le build prend automatiquement la bonne URL.

## Vérifier que tout marche

- Les badges du README sont verts.
- Dans la section **Projets** du site, le projet « Ce site » affiche le dernier run du pipeline en direct.
- Dans *Actions → Zero Trust e2e*, le résumé du job montre le tableau des contrôles
  (200, 403, timeouts) et les flux bloqués relevés par Hubble.
- Dans un terminal : `curl -sL https://louane20.github.io/portfolio/guerd.1 | man -l -`
- La version arabe répond sur **https://louane20.github.io/portfolio/ar/**.
- Le blog répond sur **https://louane20.github.io/portfolio/blog/** (et `/fr/blog/`, `/ar/blog/`), et le flux
  sur `/feed.xml`.

## Modifier le contenu

Tout le texte du site (anglais, français et arabe : champs `en`, `fr` et `ar`) est dans
`content/profile.yaml`. Les articles du
blog sont dans `content/blog/*.md`. En local :

```sh
npm ci --ignore-scripts
npm run dev        # http://127.0.0.1:4173/ , reconstruit à chaque modification
make help          # toutes les autres tâches
```

Un champ manquant dans une des deux langues, ou une expérience mal ordonnée, fait échouer le
build avec un message clair : c'est voulu.

Pour ajouter ta photo : place une image carrée dans `src/static/` (par exemple `photo.jpg`) et
mets `photo: photo.jpg` dans la section `person` de `profile.yaml`. Elle remplace le monogramme
« NG » dans l'encadré « En bref » et dans les signatures du blog.

## Écrire un article

Un article est un fichier Markdown dans `content/blog/`. Le nom du fichier donne l'adresse :
`content/blog/mon-article.md` devient `/blog/mon-article/`. L'en-tête est vérifié au build :

```yaml
---
title: Running Kubernetes behind an air gap
date: 2026-11-03
category: platform        # platform, security, delivery ou open-source
cover: airgap             # airgap, operators, open-source, zero-trust, pipeline ou gitops
featured: true            # facultatif : épinglé en haut du blog
draft: true               # facultatif : brouillon, non publié
summary: Une ou deux phrases pour les cartes, le flux RSS et les moteurs de recherche.
tags: [kubernetes, air-gapped]
---
```

Dans le texte, en plus du Markdown habituel :

- un bloc de code peut avoir un nom de fichier : ` ```yaml title="cluster.yaml" ` ;
- `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]` et `> [!IMPORTANT]` créent des encadrés ;
- un bloc ` ```diagram ` contenant le nom d'un schéma de `src/templates/blog/diagrams.mjs`
  l'insère (par exemple `airgap-zones` ou `cnpg-cluster`).

Après un nouvel article ou un titre modifié, régénère les images de partage (LinkedIn, etc.) :
`node scripts/render-images.mjs --posts`, puis commite les fichiers de `src/static/og/`.

## Le CV en PDF

Le CV n'est plus un fichier fait à la main : il est **généré depuis `profile.yaml`**, comme le
site, en anglais (`GUERD_Nawal_CV.pdf`) et en français (`GUERD_Nawal_CV_FR.pdf`). La page
française propose le CV français ; les pages anglaise et arabe, le CV anglais. Après chaque
modification de `profile.yaml` :

```sh
npm run cv         # ou : make cv
```

puis commite les deux PDF de `src/static/`. La commande refuse un CV de plus de 2 pages.

- Ce qui n'apparaît que sur le CV est dans la section `cv` de `profile.yaml` : la ligne de
  mots-clés sous le titre, le résumé, les quatre chiffres clés et la liste des projets retenus.
  Tout le reste (expérience, compétences, formation, recherche, certifications, langues) vient
  des mêmes sections que le site.
- Le PDF est lisible par les logiciels de tri des recruteurs (ATS) : vrai texte sur une colonne,
  titres de section reconnaissables, PDF balisé (accessible) avec signets. Le prompt
  `nawal@guerd:~$ whoami` au-dessus du nom est dessiné, pas écrit, pour qu'un ATS ne le prenne
  pas pour ton nom.
- Les polices du CV (`scripts/cv/fonts/`) sont des versions statiques des polices Red Hat du
  site : les polices variables s'intègrent mal dans un PDF. `scripts/cv-fonts.sh` les régénère
  (rarement utile).

## Ce qui a changé : nouveau positionnement et nouveau CV

- **Positionnement** : « DevOps & Cloud Infrastructure Engineer ». Le titre, l'accroche, la
  description pour Google et LinkedIn, la section « Profil », l'encadré « En bref » et le
  contact mettent en avant l'infrastructure cloud-native, l'automatisation (infrastructure as
  code) et le CI/CD, avec la sécurité comme atout plutôt que comme sujet principal. Rien n'a été
  inventé : tout vient de ton ancien CV et de ton profil.
- **Expertise** regroupée en 6 domaines : Kubernetes et plateformes cloud-native, automatisation
  et infrastructure as code, CI/CD et GitOps, réseau et haute disponibilité, observabilité et
  données, sécurité et Zero Trust.
- **Expérience** : les puces ATM Mobilis commencent par un verbe d'action, avec les mots-clés
  en gras, et une ligne précise ce qu'est ATM Mobilis (utile pour un recruteur à l'étranger).
- **Projets** : nouveau projet « Déploiement automatisé d'une plateforme 5G cloud-native » (ton
  mémoire), placé en premier ; le test d'intrusion et Snort sont réunis en un seul projet. La
  section Projets passe avant Recherche.
- **Nouveau CV** (voir « Le CV en PDF ») : 2 pages, en-tête façon terminal, chiffres clés,
  compétences avec les outils de production surlignés, expérience en forme de graphe git.

## Ce qui a changé : terminal interactif

- Nouvelle section **« Essayez mon terminal »** juste après l'en-tête : un vrai terminal où le
  visiteur tape des commandes. `help`, `whoami`, `neofetch`, `skills`, `experience` (ou `git log`),
  `projects`, `research`, `blog`, `contact`, `cv`, `clear`, et `sudo hire-me` qui l'emmène au
  contact. Historique avec les flèches, complétion avec Tab. Les réponses viennent de
  `profile.yaml`, dans la langue de la page. Sans JavaScript, la section montre une session
  enregistrée.
- La fenêtre `neofetch` démarre avec un journal de boot façon systemd
  (`[  OK  ] Started cilium.service`…).

## Ce qui a changé : version plus DevOps

- Nouvelle section **« Comment je livre »** juste après l'en-tête : une carte animée de ta chaîne
  de livraison en six étapes (git push → pipeline CI → registre d'images signées → GitOps avec
  Argo CD → Kubernetes avec Cilium en Zero Trust → observabilité), avec des paquets qui circulent,
  la boucle de retour (alertes → tickets → prochain commit) et, en dessous, Trivy/cosign, Vault et
  Ansible. Les animations s'arrêtent si le visiteur a demandé moins d'animations.
- Le menu fonctionne comme les étapes d'un pipeline : les sections déjà lues passent au vert, la
  section en cours est « en cours d'exécution » (orange).
- L'expérience est affichée comme un `git log --graph` : une ligne verticale et un commit par poste.
- La commande `whoami` se tape toute seule au chargement.

## Ce qui a changé : le design « console »

- Nouveau look inspiré du terminal, pensé pour ton profil DevOps, Linux, open source et sécurité :
  sombre par défaut, vert phosphore, titres en police mono (Red Hat Mono).
- L'en-tête ressemble à une barre de fenêtre de terminal, chaque section est précédée d'une
  commande (`kubectl get skills`, `git log --oneline career`, `./contact.sh`…), l'encadré « En
  bref » devient une fenêtre `neofetch`, et un curseur clignote après ton titre.
- Une barre d'état façon tmux/vim en bas de l'écran (sur ordinateur) : mode, branche, commit du
  build, page courante et heure d'Alger.
- Le bouton soleil passe au thème clair (« papier »), mémorisé par le navigateur.
- Le favicon (une invite `>_`) et les images de partage LinkedIn ont été redessinés dans le même
  style.
- Les commandes affichées sont décoratives : elles sont ignorées par les lecteurs d'écran, et
  l'accessibilité reste vérifiée par les tests (aucune erreur axe, en sombre comme en clair).

## Ce qui a changé : la version arabe

- Le site existe maintenant en arabe, sur `/ar/` et `/ar/blog/`, de droite à gauche. Le menu propose
  les deux autres langues (EN, FR ou ع selon la page).
- Police arabe IBM Plex Sans Arabic, hébergée sur le site (licence libre OFL). Les pages anglaises
  et françaises ne la téléchargent jamais, donc elles restent aussi rapides qu'avant.
- Les mois suivent l'usage algérien (جانفي، فيفري، …) et les chiffres restent occidentaux.
- Le code, les schémas et les articles du blog restent en anglais et de gauche à droite ; la page
  arabe du blog le signale.
- **Relis les traductions arabes** dans `profile.yaml` (champs `ar:`) : ton nom est laissé en
  lettres latines (Nawal Guerd), à toi de voir si tu préfères une graphie arabe.

## Ce qui a changé : le blog

- La section « Articles » est devenue un vrai blog : une page d'accueil (`/blog/`, et `/fr/blog/`
  en français) avec l'article à la une, des filtres par thème et des cartes illustrées ; une page
  par article avec sommaire qui suit la lecture, barre de progression, encadrés, code coloré avec
  bouton « Copier », boutons de partage (LinkedIn, e-mail, lien), encadré « Écrit par » et liens
  vers l'article précédent et suivant. Le lien « Blog » est dans le menu.
- Chaque article a sa propre illustration (claire et sombre) et sa propre image de partage, pour
  que le lien soit beau quand tu le publies sur LinkedIn.
- Trois nouveaux articles : *Running Kubernetes behind an air gap* (à la une), *Kubernetes
  operators in production: CloudNativePG and Strimzi* et *From install parties to production:
  why I build on open source* (qui part de ton expérience au club Openminds). Les deux articles
  existants ont reçu des schémas.
- Les schémas sont dessinés au build en SVG (13 au total) : zones d'un air gap, boucle d'un
  opérateur, cluster CloudNativePG, Kafka en mode KRaft avec Strimzi, cœur 5G sur Kubernetes,
  frise des changements de licence, pipeline et test Zero Trust.
- **Relis les articles avant de pousser** : ils sont écrits à la première personne, en ton nom.
  Les commandes et les versions ont été vérifiées (Kubernetes v1.36, Cilium v1.19, CloudNativePG
  1.30, Strimzi 1.3 avec Kafka 4.3), mais c'est à toi de confirmer que tout correspond à ce que
  tu fais vraiment. Les dates sont celles de la publication sur le site (1er et 3 novembre 2026) :
  change le champ `date` si tu préfères.
- L'article GitOps multi-datacenters reste en brouillon (`draft: true`) avec son plan.
- Les anciennes adresses (`blog.html`, `posts/*.html`, `notes/*/`) redirigent vers le blog.

## Ce qui avait changé avec la refonte

- Nouveau design, plus sobre et pensé pour les recruteurs : profil, expertise (les outils que tu
  exploites en production sont mis en avant), expérience, recherche, projets, formation,
  certifications et contact. Thème clair et sombre, police open source Red Hat.
- Ta recherche est expliquée par un schéma en trois étapes (réseau à plat, Cilium, Istio).
- Le pipeline reste la preuve technique : il est présenté comme projet à la une, avec son statut
  en direct. La version « page de manuel » existe toujours, mais seulement en lien discret en bas
  de page, pour les curieux.
- Le lieu de WCNC 2025 est corrigé : **Milan, Italie** (l'ancienne page indiquait Dubaï).
  DOI ajouté : `10.1109/WCNC61545.2025.10978671`, avec un lien vers la version en accès libre.
- Les fichiers `posts/*.html` n'étaient pas dans le dépôt, donc les liens « Read the article »
  étaient cassés. Deux articles avaient été publiés : *Zero Trust microsegmentation for
  cloud-native 5G networks* (fondé sur le résumé public de ton article) et *This portfolio is
  a pipeline*. **Relis-les** : ils sont écrits à la première personne, en ton nom.
  L'article GitOps multi-DC est en brouillon avec un plan : enlève `draft: true` quand tu l'auras
  écrit (l'article sur l'air gap est maintenant publié, voir plus haut).
- Les anciennes URL (`blog.html`, `posts/*.html`) redirigent vers les nouvelles.
- Le KodeKloud CKA est présenté comme « cours de préparation », pour qu'un recruteur ne le
  confonde pas avec la certification CNCF.
- Ton numéro de téléphone n'est plus en clair dans la page : il s'affiche au clic (anti
  scraping). `phone_display: hidden` dans `profile.yaml` le retire complètement.

## Dépannage

| Symptôme | Cause et solution |
| --- | --- |
| Le job *Deploy* échoue (« Get Pages site failed », 404) | Pages n'est pas en mode GitHub Actions : étape 2. |
| *Build* affiche un avertissement sur `configure-pages` | Normal tant que Pages n'est pas activé ; le build utilise l'URL github.io par défaut. |
| *Lighthouse* juste sous 90 en performance | Les runners partagés varient ; relance le job. Le budget est volontairement exigeant. |
| *Scorecard* échoue à publier | Le dépôt doit être public et le workflow non modifié (exigence de l'API Scorecard). |
| `cosign verify` répond « UNAUTHORIZED » | L'image est encore privée : étape 5. |
| *Zero Trust e2e* échoue | Le job lance un diagnostic automatique (pods, événements, `cilium status`, Hubble) : regarde ses logs. |
