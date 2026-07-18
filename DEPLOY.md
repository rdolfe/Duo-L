# 🚀 Mettre DuoSpeak en ligne

L'application est prête pour la production : l'API Fastify sert aussi le site compilé (un seul service à héberger), la base bascule sur PostgreSQL via `DATABASE_URL`, et le seed ne s'exécute qu'une fois (il ne touche jamais aux comptes existants).

## Option recommandée : Render (gratuit)

Le fichier [render.yaml](render.yaml) décrit tout (service web + base PostgreSQL). Il te reste 3 étapes **que toi seul peux faire** (création de comptes) :

1. **Pousse le projet sur GitHub**
   ```bash
   git init
   git add .
   git commit -m "DuoSpeak v1"
   ```
   Puis crée un dépôt sur github.com et pousse (`git remote add origin … && git push -u origin main`).

2. **Crée un compte sur [render.com](https://render.com)** (connexion GitHub possible).

3. **New → Blueprint** → choisis ton dépôt → Render lit `render.yaml` et crée automatiquement :
   - la base PostgreSQL `duospeak-db` ;
   - le service web `duospeak` (build + migrations + seed + démarrage).

   Quelques minutes plus tard tu obtiens une URL publique du type `https://duospeak.onrender.com`, en **HTTPS** (obligatoire pour que le micro fonctionne).

### Notes Render

- **Plan gratuit** : le service s'endort après 15 min d'inactivité (premier chargement lent ensuite), et la base gratuite expire après 90 jours (passe au plan payant ou migre vers [Neon](https://neon.tech), gratuit sans limite de durée : il suffit de remplacer `DATABASE_URL` dans les réglages du service).
- **Mise à jour du contenu des leçons** : le seed **synchronise automatiquement** le contenu à chaque déploiement (nouveau contenu créé, existant mis à jour) **sans toucher aux comptes ni à la progression**. Ajouter du contenu = un simple `git push`. `FORCE_SEED=1` ne sert plus qu'à une remise à zéro complète (⚠️ efface la progression des joueurs).

## Mobile 📱

Rien à installer : le site est responsive et fonctionne dans le navigateur mobile.

| Plateforme | Micro (reconnaissance vocale) | Exercices écrits |
|---|---|---|
| Android — Chrome | ✅ | ✅ |
| iPhone — Safari | ✅ (iOS 14.5+, sinon mode clavier) | ✅ |
| Firefox | ❌ micro → mode clavier automatique | ✅ |

Le micro exige HTTPS : c'est le cas sur Render. Les utilisateurs peuvent « Ajouter à l'écran d'accueil » pour un accès type appli.

## Alternatives

- **Railway.app** : similaire à Render, base PostgreSQL intégrée, pas de mise en veille (payant après l'essai).
- **Fly.io** : plus technique (Dockerfile), volumes persistants.
- **VPS (OVH, Hetzner…)** : contrôle total ; lance `npm install && npm run build && NODE_ENV=production npm start` derrière un reverse proxy HTTPS (Caddy est le plus simple).

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Chaîne PostgreSQL (prod uniquement — en local, SQLite automatique) |
| `JWT_SECRET` | Secret de signature des tokens (obligatoire en prod) |
| `NODE_ENV=production` | Sert le frontend compilé + écoute sur 0.0.0.0 |
| `PORT` | Injecté par l'hébergeur |
