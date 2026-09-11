# WhatsApp Webhook Server

A minimal Express server for receiving and acknowledging WhatsApp webhook events.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `PORT` — server port
- Optional env: `WHATSAPP_VERIFY_TOKEN` — token used by Meta webhook verification

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/routes/whatsapp.ts` — WhatsApp webhook verification and message routes
- `artifacts/api-server/src/routes/index.ts` — API route registration

## Architecture decisions

- Webhook routes are exposed under `/api/webhook` through the existing API service prefix.
- Verification uses `WHATSAPP_VERIFY_TOKEN`; message payload handling is intentionally left in `whatsapp.ts`.

## Product

- Responds to Meta's GET webhook verification request.
- Acknowledges incoming POST webhook payloads with HTTP 200.

## User preferences

- Keep the server minimal so custom WhatsApp message handling can be added later.

## Gotchas

- Set `WHATSAPP_VERIFY_TOKEN` to the same value configured in Meta before completing webhook verification.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
