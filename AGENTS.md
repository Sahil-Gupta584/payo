# AGENTS.md — Payo

## What is this

Payo is an MCP server that lets AI agents (Claude etc.) shop online on behalf of users.
Users top up a wallet, the agent searches products and places orders via browser automation.

## Architecture

Monorepo using npm workspaces & Turborepo:
- **`apps/web`**: Dashboard UI + oRPC API + Better-Auth + Dodo Payments. Deployed to Vercel (fast serverless).
- **`apps/mcp`**: Dedicated MCP server + Solari browser automation (`@solarisdk/browser`). Deployed to long-running host / Docker / Railway (no timeouts).
- **`packages/db`**: Shared Drizzle ORM + PostgreSQL schema & client (`@repo/db`).

## Stack

- **Dashboard / Web**: TanStack Start (Vite + React 19, SSR)
- **Router**: TanStack Router — file-based at `apps/web/src/routes/`. Never edit `src/routeTree.gen.ts` manually. Run `npm run generate-routes` after adding or renaming routes.
- **Server API**: oRPC with Zod validation (`/api/rpc/*`) in `apps/web`
- **Database**: Drizzle ORM + PostgreSQL (Supabase) via `@repo/db`.
- **Auth**: better-auth — magic link only (invite-only). Client: `#/lib/auth-client`.
- **MCP Server**: Express + `@modelcontextprotocol/sdk` in `apps/mcp` (`POST /mcp`), auth via Bearer API key or session cookie.
- **Browser Automation**: Solari (`@solarisdk/browser`) inside `apps/mcp/src/lib/solari/`
- **Product Search**: QuickCommerce API (`apps/mcp/src/lib/quickcommerce.ts`)
- **Payments**: Dodo Payments (wallet top-up in `apps/web`)
- **UI**: shadcn/ui + Tailwind CSS v4. Light theme.
- **Icons**: lucide-react

## Import aliases

`#/*` resolves to `./src/*` inside `apps/web`. Both `web` and `mcp` import `@repo/db`.

## Key conventions

1. **Routing**: Never create dot-nested route files (`settings.dashboard.tsx`). Use flat directory-based nested routes (`src/routes/_protected/settings.tsx`).
2. **Auth in protected routes**: Never call `authClient.useSession()` or `getSession()` inside `_protected/*` pages. User is already in context from `_protected.tsx`. Access via `const { user } = Route.useRouteContext()`.
3. **Env variables**: Always import from `#/env`. Never use `process.env` directly.
4. **Forms**: For more than 2 inputs, use react-hook-form + Zod schema resolver. Define schema at top of file, infer type with `z.infer<typeof schema>`.
5. **Database migrations**: NEVER use `db:push`. Always `npm run db:generate` then `npm run db:migrate`.
6. **Types**: Reuse inferred types from `src/db/schema.ts` (e.g. `User`, `Order`, `Wallet`). Do not create duplicate interfaces.
7. **Solari scripts**: One file per platform — `src/lib/solari/flipkart.ts`, `src/lib/solari/instamart.ts`. Shared helpers in `src/lib/solari/index.ts`.
8. **Route file size**: If a route file exceeds ~500 lines, extract into a folder with sub-components.
9. **Ask, don't assume**: If a fix has multiple valid options or the intent is unclear, ask the user first instead of guessing.

## Commands

```bash
npm run dev              # start dev servers across all workspaces
npm run dev:w            # start web dev server on port 3000
npm run dev:m            # start dedicated MCP dev server on port 4000
npm run generate-routes  # regenerate TanStack Router route tree (run after adding routes)
npm run db:generate      # generate SQL migration files from schema changes
npm run db:migrate       # apply pending migrations to the database
npm run build            # production build
npm run lint             # lint
```

## Platforms supported

| Platform | Search | Checkout | Status |
|---|---|---|---|
| Flipkart | QuickCommerce API | Solari browser + direct payments API | ✅ Working (stops at OTP) |
| Swiggy Instamart | QuickCommerce API | Solari browser | 🚧 Cart only (checkout pending recon) |

## MCP tools

| Tool | Description |
|---|---|
| `search_products` | Search Flipkart or Swiggy via QuickCommerce API |
| `get_wallet_balance` | Returns user's wallet balance |
| `initiate_order` | Places order — checks wallet, runs automation, returns OTP page |
| `list_orders` | Lists user's recent orders |

## MCP install (Claude Desktop)

```bash
opencode mcp add payo --url https://mcp.yourdomain.com/mcp --header "Authorization=Bearer YOUR_API_KEY"
```

## Invite-only access

Add email to `invite` table in DB to allow login. No UI — insert directly via drizzle studio (`npm run db:studio`).
