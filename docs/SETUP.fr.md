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
- La section **CODE DE RETOUR / EXIT STATUS** du site affiche le dernier run en direct.
- Dans *Actions → Zero Trust e2e*, le résumé du job montre le tableau des contrôles
  (200, 403, timeouts) et les flux bloqués relevés par Hubble.
- Dans un terminal : `curl -sL https://louane20.github.io/portfolio/guerd.1 | man -l -`

## Modifier le contenu

Tout le texte du site (anglais et français) est dans `content/profile.yaml`. Les articles sont
dans `content/notes/*.md`. En local :

```sh
npm ci --ignore-scripts
npm run dev        # http://127.0.0.1:4173/ , reconstruit à chaque modification
make help          # toutes les autres tâches
```

Un champ manquant dans une des deux langues, ou une compétence qui cite une expérience
inexistante, fait échouer le build avec un message clair : c'est voulu.

## Ce qui a changé par rapport à la version précédente

- Le lieu de WCNC 2025 est corrigé : **Milan, Italie** (l'ancienne page indiquait Dubaï).
  DOI ajouté : `10.1109/WCNC61545.2025.10978671`, avec un lien vers la version en accès libre.
- Les fichiers `posts/*.html` n'étaient pas dans le dépôt, donc les liens « Read the article »
  étaient cassés. Deux articles sont maintenant publiés : *Zero Trust microsegmentation for
  cloud-native 5G networks* (fondé sur le résumé public de ton article) et *This portfolio is
  a pipeline*. **Relis-les** : ils sont écrits à la première personne, en ton nom.
  Les deux autres (air gap, GitOps multi-DC) sont en brouillon avec un plan, non publiés :
  enlève `draft: true` quand tu les auras écrits.
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
