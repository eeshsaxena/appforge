# AppForge — a metadata-driven application runtime

AppForge turns a single JSON **app configuration** into a working application:
the UI (forms, tables, dashboards), the REST APIs, the data storage, and
config-driven workflows are all generated **at runtime** from that config.

> Internship demo — **Track A (AI App Generator)**, **Full-Stack** role.
> Reference product: [base44](https://base44.com).

- **Live demo:** https://appforge-opal-ten.vercel.app
- **Demo login:** `demo@appforge.dev` / `demo1234` (or sign up — data is per-user)
- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Prisma · PostgreSQL (Neon) · Vercel

---

## The core idea

You describe an app as JSON:

```jsonc
{
  "name": "Mini CRM",
  "entities": [
    {
      "name": "Contact",
      "fields": [
        { "name": "fullName", "type": "text", "required": true },
        { "name": "email", "type": "email", "required": true },
        { "name": "status", "type": "select", "options": ["Lead", "Active", "Churned"] },
        { "name": "value", "type": "number" }
      ]
    }
  ],
  "views": [
    { "type": "table", "entity": "Contact", "columns": ["fullName", "email", "status", "value"] },
    { "type": "dashboard", "widgets": [{ "type": "stat", "entity": "Contact", "metric": "count" }] }
  ],
  "workflows": [
    {
      "name": "Tag new leads",
      "trigger": { "type": "record.created", "entity": "Contact" },
      "actions": [{ "type": "setField", "field": "status", "value": "Lead" }]
    }
  ]
}
```

…and AppForge gives you a live app with create/read/update/delete, validation,
search, sorting, pagination, dashboards, and automation — no codegen, no
migrations.

## Key architectural decision — *schema-on-read*

The hardest part of a config-driven runtime is storage: app configs change
constantly and can be malformed. Running real `CREATE TABLE` / `ALTER TABLE`
DDL per entity is fragile — a bad config could break a migration or corrupt the
database.

Instead, AppForge stores **all** records in a single `Record` table with a
`JSONB data` column, scoped by `(appId, entity, ownerId)` and indexed. The app
config lives in `App.config` (also JSONB). **No per-app DDL ever runs**, so any
config — even a broken one — can never damage the schema. Validation happens at
the **application layer**, using a Zod schema *built at runtime* from the
config.

```
Untrusted JSON config
        │
        ▼
 normalizeConfig()  ──►  { config, issues[] }   (never throws; repairs + reports)
        │
        ├──►  Frontend rendering engine  (component registry + error boundaries)
        ├──►  buildRecordSchema()  ──►  runtime Zod validation for every write
        └──►  Workflow engine  (triggers → actions, audited)
```

## Resilience (graceful degradation)

The config is treated as **untrusted input**. `src/lib/config/normalize.ts`
turns any value into a stable `NormalizedConfig` and collects `issues` instead
of throwing:

| Problem in config | What AppForge does |
| --- | --- |
| Top-level isn't an object | Falls back to an empty app + error |
| Missing `name`, `label`, etc. | Sensible defaults (humanized from the key) |
| Unknown **field** type | Degrades to text, flags it in the UI |
| Unknown **view/widget** type | Renders a graceful fallback card |
| `select` with no `options` | Warns; renders an empty select |
| Duplicate entity / field names | De-duplicates with a warning |
| Table references a missing entity/column | Skips it with an error/warning |
| Workflow with unknown trigger/action | Skips the bad part, keeps the rest |

Every screen is additionally wrapped in React **error boundaries**, so one
broken widget can never crash the page. The builder shows a live **config
health** panel listing all issues with their JSON path.

## Tech stack & why

- **Next.js 16 App Router** — one codebase for UI + API routes; deploys to Vercel.
- **Prisma 6 + PostgreSQL** — Prisma 6 (classic engine) for a simple, reliable
  client; JSONB columns for schema-on-read.
- **Zod v4** — runtime schemas, including ones generated dynamically per entity.
- **Custom JWT auth** (`jose` + `bcryptjs`, httpOnly cookie) — fully owned,
  user-scoped data access.
- **TanStack Query** — client data/cache/state for the runtime UI.
- **react-hook-form** — dynamic forms driven by field config.

## The three bonus features

1. **CSV import** — upload a CSV into any entity; map headers → fields; every
   row is validated against the runtime schema; valid rows are inserted and
   invalid rows are reported per-row.
2. **Workflow automation** — config-defined `record.created/updated/deleted`
   triggers run actions (`log`, `notify`, `setField`, `webhook`) inside the
   mutation pipeline, with every run audited in an activity feed.
3. **GitHub export** — export an app (its config + a generated scaffold/README)
   to a brand-new GitHub repository via the GitHub API, or download the config
   as JSON.

## Project structure

```
src/
  app/
    api/                 # backend runtime (auth, apps, dynamic records, …)
    (app)/               # authenticated UI (dashboard, builder, runner)
    login, signup        # auth pages
  lib/
    config/
      schema.ts          # config type system + supported types
      normalize.ts       # resilient normalizer (untrusted JSON -> NormalizedConfig)
      validation.ts      # runtime Zod schema built from entity fields
    workflows/engine.ts  # trigger -> action workflow runner
    auth.ts, api.ts      # JWT auth + API response/error helpers
    db.ts, apps.ts, records.ts, utils.ts
  components/
    renderer/            # DynamicForm, DynamicTable, DynamicView, field registry
    ui/                  # reusable primitives
prisma/
  schema.prisma          # User, App, Record, WorkflowRun
  seed.ts                # example templates incl. a deliberately broken config
```

## Local setup

```bash
cp .env.example .env        # set DATABASE_URL + DIRECT_URL (Neon) and JWT_SECRET
npm install
npm run db:push             # create tables
npm run db:seed             # optional: example apps + demo user
npm run dev                 # http://localhost:3000
```

Generate a secret with `openssl rand -base64 48`.

## API surface

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/signup` `/login` `/logout` | Auth |
| `GET` | `/api/auth/me` | Current user |
| `GET/POST` | `/api/apps` | List / create apps |
| `GET/PUT/DELETE` | `/api/apps/:id` | Read / update / delete an app (+ config) |
| `GET/POST` | `/api/apps/:id/entities/:entity/records` | List (search/sort/paginate) / create |
| `GET/PUT/DELETE` | `/api/apps/:id/entities/:entity/records/:recordId` | Record CRUD |
| `POST` | `/api/apps/:id/entities/:entity/import` | CSV import |
| `GET/POST` | `/api/apps/:id/export` | Download config / export to GitHub |
| `GET` | `/api/apps/:id/runs` | Workflow activity feed |

All responses use a consistent envelope: `{ data }` on success,
`{ error: { code, message, details } }` on failure. Every route is wrapped so it
returns structured JSON — never a 500 HTML page.
