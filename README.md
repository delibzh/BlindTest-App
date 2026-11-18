# Talaref — Blindtest

> ⚠️ **Projet de test, non abouti.** Prototype d'appli mobile de blindtest développé en solo, jamais publié sur les stores. Le code est partagé tel quel, à titre d'exemple.

Appli de blindtest (musiques de jeux vidéo, films, séries, animés, dessins animés, pubs, répliques…) construite avec **Expo / React Native** et **Supabase**.

## Fonctionnalités (prototype)

- **Solo** : QCM par catégorie et difficulté
- **Infini** : enchaîner les extraits jusqu'à perdre ses vies
- **Défi** : deviner le titre au clavier
- **Buzz / Soirée** : multijoueur local sur un seul téléphone
- **Salon** : multijoueur en ligne (Socket.IO)
- Profil, progression, succès, séries, classement
- Boutique cosmétique, premium (RevenueCat), pubs (AdMob)

## Stack

| Partie | Techno |
|---|---|
| App | Expo 54, React Native 0.81, expo-router, TypeScript |
| Backend | Supabase (auth, Postgres, RLS, Edge Functions) |
| Audio | Cloudflare R2 (URLs signées via Edge Function) |
| Multijoueur | Serveur Socket.IO séparé (non inclus) |
| Monétisation | RevenueCat, Google AdMob |

## Structure

```
app/          Écrans (expo-router) : (auth) et (app)
components/   Composants UI
hooks/        Hooks React (auth, profil, premium…)
lib/          Logique métier (progression, défis, sons, Supabase…)
supabase/     Schéma SQL, migrations, Edge Function get-audio-url
scripts/      Scripts d'admin Node (remplissage d'images IGDB/TMDB, tags)
__tests__/    Tests Jest
```

## Lancer le projet

```bash
npm install
cp .env.example .env   # puis remplir les valeurs
npx expo start
```

Base de données : exécuter `supabase/schema.sql` puis les fichiers `migration_*.sql` dans un projet Supabase.

### Scripts d'admin

Ils lisent leurs clés depuis `.env` (Node 20.6+) :

```bash
node --env-file=.env scripts/list-categories.mjs
```

## Tests

```bash
npm test
```

## Crédits

Icônes : voir `credits/credits icons.txt`.
