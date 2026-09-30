# Commands

From the project root (`freelanceMarketplace`).

## Start the app

```
npm run dev
```

App: [http://localhost:3000](http://localhost:3000).

## Prisma Studio

```
npx prisma studio
```

GUI for the tables. Class User is table `users`. Prisma is the ORM. PostgreSQL is the database.

If it cannot reach `localhost:5432`, PostgreSQL is not running (not a Prisma error). On this machine: `brew services start postgresql@14`.

## Migrations

```
npx prisma migrate status
```

Lists applied vs pending migrations.

## Prisma client after a schema change

I run this when I have changed `prisma/schema.prisma` (or after a new migration), so TypeScript matches the tables:

```
npx prisma generate
```

## Seed

```
npm run db:seed
```

Reloads demo users from `prisma/seed.ts` and overwrites those rows. I only use it for a full demo reset, not to inspect tables.

## PostgreSQL (`psql`)

Needs `DATABASE_URL` in `.env` (same as Prisma).

Open a SQL shell:

```
psql "$DATABASE_URL"
```

Inside `psql`:

```
\dt
```

List tables.

```
\d users
```

Columns and keys of `users` (quoted names like `"clerkId"`).

```
SELECT email, "clerkId", "roleId" FROM users LIMIT 10;
```

Sample users. `\q` to quit.

One-shot from the terminal (no interactive shell):

```
psql "$DATABASE_URL" -c '\dt'
psql "$DATABASE_URL" -c 'SELECT email, "clerkId", "roleId" FROM users LIMIT 10;'
```

I avoid `prisma migrate reset`, `DROP TABLE`, and `git push --force`.
