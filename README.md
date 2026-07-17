# 🦜 DuoSpeak

Application d'apprentissage de l'anglais **100 % à l'oral** (type Duolingo). Interface en français.

## Stack

- **Frontend** : React 18 + Vite + TypeScript — reconnaissance vocale via la Web Speech API (Chrome/Edge) et synthèse vocale native.
- **Backend** : Node.js + Fastify + TypeScript — le serveur calcule les scores de prononciation et applique la gamification (XP, vies, séries, badges). Le client n'est jamais la source de vérité.
- **Base de données** : SQLite via Prisma (migration vers PostgreSQL possible en changeant une ligne dans `schema.prisma`).

## Démarrage

```bash
npm install
npm run db:setup      # crée la base + insère les leçons (A1 → C2) et les badges
npm run dev:api       # API sur http://127.0.0.1:3001
npm run dev:web       # Web sur http://localhost:5173 (dans un second terminal)
```

Ouvre http://localhost:5173 dans **Chrome ou Edge** (la reconnaissance vocale Web Speech n'est pas disponible sur Firefox). Un mode clavier de secours est intégré si le micro est indisponible.

## Fonctionnalités

- 4 types d'exercices **oraux** : Écoute & répète, Traduis & parle, Dialogue (roleplay), Lecture à voix haute (score par mot).
- 4 types d'exercices **écrits** : QCM (bonnes et mauvaises réponses), Phrase à trou, Traduction écrite, Dictée (score par mot).
- **Validation manuelle** : le joueur choisit/enregistre sa réponse puis clique « Valider » — rien n'est comptabilisé avant. Le micro se contrôle au clic (démarrer / arrêter), avec relecture avant de valider.
- **Bonne réponse affichée** dès que le score n'atteint pas 100 %, sur chaque exercice comme dans les tests.
- **Tests de fin de niveau notés sur 20** : à la fin de chaque niveau, un examen (toutes catégories mélangées) qu'il faut réussir (≥ 12/20) pour débloquer le niveau CECRL suivant.
- Bouton « 💡 Je ne sais pas — voir la réponse » sur chaque exercice de leçon (coûte 1 cœur ; les tests ne coûtent pas de cœurs).
- Scoring : alignement mot à mot (Needleman-Wunsch) + distance de Levenshtein, calculé côté serveur ; comparaison exacte pour les QCM. Les nombres sont normalisés : « 1 » et « one », « 21 » et « twenty-one » sont équivalents.
- Gamification : XP (journal `XpEvent`), séries quotidiennes, 5 vies (régénération : 1 cœur / 7 s), 9 badges.
- Parcours A1 → C2 : 15 unités, 29 leçons, 6 tests de niveau, ~300 exercices. Les exercices sont regroupés par type au sein de chaque leçon ; déblocage séquentiel des leçons, puis des niveaux via les tests.
- Interface responsive (mobile inclus) — voir [DEPLOY.md](DEPLOY.md) pour la mise en ligne.

## Structure

```
apps/api   Fastify + Prisma (routes: auth, content, attempts) 
apps/web   React (features: auth, dashboard, lesson, exam, exercises)
```

## V2 envisagée

- Azure Speech « Pronunciation Assessment » pour un score par phonème.
- PWA installable, leaderboard, plus de contenu.
