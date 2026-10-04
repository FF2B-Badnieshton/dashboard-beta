# Dashboard Beta FF2B (Nuxt 3 + Nitro + Prisma)

Prototype V1 du dashboard d'administration FF2B pour gérer les licenciés, les rôles et les sites de pratique.

## Stack

- **Nuxt + Nitro** (frontend + API serveur intermédiaire)
- **Nuxt UI** + Tailwind CSS
- **PostgreSQL Supabase**
- **Prisma** utilisé strictement côté serveur
- **Netlify** (preset Nitro)

## Architecture imposée

- Le frontend n'accède **jamais** directement à Supabase.
- Toutes les opérations passent par `/server/api/*`.
- Prisma est aligné en **database-first** via introspection (`prisma db pull`).

## Structure clé

- `/app/layouts/dashboard.vue` : navigation admin + `UColorModeButton`
- `/app/pages/admin/index.vue` : tableau de bord
- `/app/pages/admin/login.vue` : connexion liée à la BDD via API Nitro
- `/app/pages/admin/licencies.vue` : listing membres avec `UTable`
- `/app/pages/admin/database.vue` : administration générique de **tous** les modèles Prisma
- `/app/pages/admin/users.vue` : gestion des comptes utilisateurs, rôles et mots de passe
- `/server/api/persons/index.get.ts` : `prisma.persons.findMany`
- `/server/api/db/models.get.ts` + `/server/api/db/records.post.ts` : CRUD universel database-first
- `/server/api/users/*` : CRUD comptes utilisateurs avec mot de passe hashé
- `/server/utils/prisma.ts` : singleton PrismaClient

## Démarrage local

1. Installer les dépendances

```bash
pnpm install
```

2. Configurer l'environnement

```bash
cp .env.example .env
# puis renseigner DATABASE_URL et NUXT_SESSION_PASSWORD
```

3. Synchroniser Prisma depuis Supabase

```bash
pnpm prisma:pull
pnpm prisma:generate
```

4. Lancer le projet

```bash
pnpm dev
```

## Commandes utiles

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Notes

- Le login valide l'email dans la table `users` et vérifie le mot de passe hashé en base.
- La session HTTP est signée via `NUXT_SESSION_PASSWORD` (cookie `ff2b_session`).
- L'interface `/admin/database` permet CRUD complet (lecture, ajout, modification, suppression) sur l'ensemble des modèles Prisma sans mock.
