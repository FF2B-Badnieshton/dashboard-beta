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
- `/server/api/persons/index.get.ts` : `prisma.persons.findMany`
- `/server/utils/prisma.ts` : singleton PrismaClient

## Démarrage local

1. Installer les dépendances

```bash
pnpm install
```

2. Configurer l'environnement

```bash
cp .env.example .env
# puis renseigner DATABASE_URL, DASHBOARD_PASSWORD, NUXT_SESSION_PASSWORD
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

- Le login valide l'email dans la table `persons` et le mot de passe applicatif `DASHBOARD_PASSWORD`.
- La session HTTP est signée via `NUXT_SESSION_PASSWORD` (cookie `ff2b_session`).
- Ce socle est prêt pour brancher les opérations CRUD complètes sur les modules admin.
