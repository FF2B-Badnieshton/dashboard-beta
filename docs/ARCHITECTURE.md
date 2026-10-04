# Architecture V1 - Dashboard FF2B

## Flux de données

1. Les pages Nuxt (frontend) appellent les routes Nitro sous `/api/*`.
2. Les routes Nitro utilisent Prisma côté serveur uniquement.
3. Prisma se connecte à PostgreSQL Supabase via `DATABASE_URL`.

## Convention Database-First

- Le schéma SQL source est géré dans Supabase (`init.sql`).
- Le schéma Prisma doit être synchronisé avec `npx prisma db pull`.
- Le client TypeScript est régénéré via `npx prisma generate`.

## Modules V1

- `/admin` : vue synthétique de pilotage
- `/admin/licencies` : liste des membres avec `UTable`
- `/admin/database` : console CRUD complète pour tous les modèles Prisma
- `/admin/users` : gestion des comptes utilisateurs et des rôles
- `/admin/sites` : module de gestion des sites
- `/admin/referents` : module de gestion des référents
