# Payo — Powering AI to shop online

Payo is an **MCP server** that lets AI agents (Claude, OpenCode, etc.) shop online on behalf of users. Users top up a wallet, the agent searches products and places orders via browser automation.

```
User: "order me peanut butter" → Agent → search_products → initiate_order → OTP → confirm_order
```

## Stack

- **Framework**: TanStack Start (Vite + React 19, SSR)
- **Router**: TanStack Router — file-based at `src/routes/`
- **Server API**: oRPC + Zod (`/api/rpc/*`)
- **Database**: Drizzle ORM + PostgreSQL (Supabase) — schema at `src/db/schema.ts`
- **Auth**: better-auth — magic link, invite-only — client at `#/lib/auth-client`
- **Browser automation**: Solari (`@solarisdk/browser`) — persistent profiles per platform
- **Product search**: QuickCommerce API (`src/lib/quickcommerce.ts`) — Swiggy Instamart (filter `p.platform.name === "Swiggy"`)
- **Payments**: Dodo Payments — wallet top-up via checkout sessions + webhook
- **MCP**: `@modelcontextprotocol/sdk` — endpoint at `POST /mcp`, Bearer API key or session cookie
- **UI**: shadcn/ui + Tailwind CSS v4, Nunito

## Monorepo

```
apps/web — main app (port 3000)
```

## Key conventions

1. **Wallet**: balance lives on `user.balance` (`integer`, `DEFAULT 0`, nullable for better-auth inserts). `wallet` table is legacy. History in `wallet_history`.
2. **Orders**: `order` is clean history only. Transient OTP fields live in `order_payment_session` (SBI `transactionId/nonce/timestamp/signature`, 10m TTL). Reorder via `order_history`.
3. **Auth tables** (`user/session/account/verification`) use `text` PKs for better-auth; app tables use `uuid` where appropriate.
4. **Env**: import from `#/env`, never `process.env`
5. **Migrations**: `npm run db:generate` → `npm run db:migrate` (never `db:push`)
6. **Shopping**: MCP-only — `src/routes/mcp.ts`. Not exposed via oRPC `/api/rpc/shop`.

## MCP tools

| Tool | Description |
|---|---|
| `search_products` | Search Swiggy Instamart — `query`, `limit` (1-30, default 15) |
| `get_wallet_balance` | User wallet balance from `user.balance` |
| `initiate_order` | Checks wallet, runs browser → Juspay tokenize/txns → SBI OTP page, stores `order_payment_session` |
| `confirm_order` | Direct server POST to SBI `ajaxProcessChallenge` with OTP + stored SBI fields, debits `user.balance`, writes `wallet_history` |
| `list_orders` | Order history with `query` filter + `limit` — for "order my last coke" |

## QuickCommerce

- Swiggy-only: `PLATFORM = 'Swiggy'` and `.filter(p.platform.name === "Swiggy")` in `quickcommerce.ts`
- `/v1/search` returns `total_results: 30`, no pagination — we slice by `limit`

## Dodo Payments

- Wallet top-up via `POST /checkoutSessions` — pay-what-you-want product `DODO_PAYMENTS_WALLET_PRODUCT_ID`, custom `amount` (cents), `metadata: { userId, amount }`
- Webhook `POST /api/webhook/dodo` — `dodo.webhooks.unwrap`, idempotency on `wallet_history.referenceId = payment_id`, `sql`${user.balance} + amount``

See QuickFeed (`C:/s/quickfeed/src/lib/dodo.ts` + `src/orpc/router/billing.ts` + `src/routes/api/webhook/dodo.ts`) for reference.

## Solari — Instamart checkout

Browser: `ADD → cart → Proceed to Pay` → `page.evaluate(fetch)` to `checkout/order` → `transaction_id` → server `juspay/tokenize` → `juspay/txns` → `authentication.url` → navigate → Cardinal StepUp → SBI iframe → scrape `transactionIdentifier/nonce/timestamp/signature` → store in `order_payment_session`.

Confirm: direct `fetch` to `https://crqsbiacs.sbi.bank.in/acs/ajaxProcessChallenge` with OTP — no browser, no cookie (verified `credentials: omit` returns `Invalid OTP` not auth error).

## Commands

```bash
npm run dev              # port 3000
npm run generate-routes  # after adding routes
npm run db:generate      # from schema changes
npm run db:migrate       # apply migrations
npm run build
npm run check-types      # tsc --noEmit
```

## MCP install

```bash
opencode mcp add payo --url https://your-app.vercel.app/mcp --header "Authorization=Bearer YOUR_API_KEY"
```

## Invite-only access

Insert email into `invite` table via `npm run db:studio`.

## Landing page

- Apple HIG liquid glass, `public/hero-image.png` background, `public/favicon.png` blended with `mix-blend-multiply`
- Nunito via Google Fonts, `island-shell` borders `1px solid rgba(255,255,255,0.7)` + `box-shadow: 0 4px 24px rgba(0,0,0,0.08)`
- Nav: glass pill, waitlist `POST /api/rpc/waitlist.join`
