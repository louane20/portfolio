# Nawal Guerd — Portfolio

Site portfolio statique (HTML / CSS / JS, aucune dépendance, aucun backend) pour Nawal Guerd, DevOps Engineer.

## Structure du projet

```
.
├── index.html              # Page principale (profil, stack, expérience, projets, contact)
├── blog.html                # Liste des articles "Field Notes"
├── posts/                   # Articles de blog individuels
│   ├── zero-trust-5g.html
│   ├── airgapped-kubernetes.html
│   └── gitops-multi-dc.html
└── assets/
    ├── css/style.css         # Feuille de style unique du site
    └── js/main.js            # Menu mobile, accordéon, bouton copier l'email, etc.
```

⚠️ **Important :** ne change pas les noms de dossiers (`assets/`, `posts/`) ni leur position par rapport à `index.html` — tous les liens CSS/JS et entre pages sont relatifs à cette structure.

## Déployer gratuitement

Trois options gratuites, du plus simple au plus "pro". Choisis-en une seule.

### Option 1 — Netlify (le plus rapide, sans compte Git nécessaire)

1. Va sur [app.netlify.com/drop](https://app.netlify.com/drop).
2. Glisse-dépose **tout le dossier** (celui qui contient `index.html`) sur la page.
3. Netlify déploie le site en quelques secondes et te donne une URL du type `https://nom-aleatoire.netlify.app`.
4. (Optionnel) Crée un compte Netlify gratuit pour renommer le sous-domaine (`Site settings > Change site name`) ou brancher un nom de domaine personnalisé.

### Option 2 — Vercel

1. Crée un compte gratuit sur [vercel.com](https://vercel.com).
2. Clique sur "Add New" > "Project" > onglet pour un déploiement sans Git, ou installe la CLI (`npm i -g vercel`) et lance `vercel` depuis ce dossier.
3. Vercel te donne une URL du type `https://ton-projet.vercel.app`.

### Option 3 — GitHub Pages (le plus adapté si tu veux versionner le code)

1. Crée un compte sur [github.com](https://github.com) si tu n'en as pas.
2. Crée un nouveau repository public, par exemple `nawal-portfolio` (sans README ni .gitignore).
3. Sur la page du repo vide, clique "uploading an existing file" et glisse-dépose tout le contenu de ce dossier (en gardant la structure `assets/`, `posts/`).
4. Commit les changements.
5. Va dans **Settings > Pages**, choisis "Deploy from a branch", branche `main`, dossier `/ (root)`, puis Save.
6. Après 1-2 minutes, ton site est en ligne sur `https://ton-pseudo.github.io/nawal-portfolio/`.

## Nom de domaine personnalisé (optionnel)

Si tu veux un domaine du type `nawalguerd.dev` au lieu de `xxx.netlify.app` ou `xxx.github.io` :

1. Achète le domaine chez un registrar (Namecheap, OVH, Google Domains, etc. — quelques euros par an).
2. Dans les paramètres de ton hébergeur (Netlify "Domain settings", Vercel "Domains", ou GitHub "Settings > Pages > Custom domain"), ajoute ton domaine.
3. Configure les enregistrements DNS indiqués par l'hébergeur (en général un `CNAME` ou des enregistrements `A`).
4. Le certificat HTTPS est généré automatiquement par l'hébergeur, gratuitement.

## Mettre à jour le contenu

Tout le texte est directement dans les fichiers `.html` — pas de base de données ni de CMS. Pour modifier une info (poste, certification, article de blog...), ouvre le fichier concerné dans un éditeur de texte, modifie le texte entre les balises, sauvegarde, puis re-déploie :

- **Netlify / Vercel** : re-glisse le dossier mis à jour (Netlify Drop) ou repousse (`vercel --prod`).
- **GitHub Pages** : commit et push les changements sur la branche `main` ; le site se met à jour automatiquement en 1-2 minutes.

## Ajouter un nouvel article de blog

1. Duplique un des fichiers dans `posts/` comme point de départ.
2. Modifie le titre, la date, et le contenu de l'article.
3. Ajoute une carte correspondante dans `blog.html` (section `.blog-grid`) et dans `index.html` (section `#field-notes`), avec un lien vers ton nouveau fichier.

## Contact

Nawal Guerd — guerd.nawal@gmail.com — [LinkedIn](https://www.linkedin.com/in/nawal-guerd-140b191ba) — [GitHub](https://github.com/louane20)
