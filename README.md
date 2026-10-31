# Green & Tasty — restaurant frontend

Angular single-page app for booking tables, reservations and pre-orders. Three roles: **client**, **waiter**, **admin**.
Standalone components, signals, SCSS, Karma + Jasmine. Deployed to S3 + CloudFront.

Live: https://d1qn764peiycxo.cloudfront.net

## Owner flow (group pre-order)

The reservation owner can:

- book a table and share an invite link with guests;
- follow every guest's cart on the **Group Pre-Order** page (Submitted / Still choosing), refreshed automatically;
- **remind guests who haven't chosen dishes yet** — one guest or everyone at once (own feature);
- remove a guest, review the consolidated order and send it to the restaurant;
- view-only mode when less than 30 minutes remain before the reservation: no changes, no reminders, no submit
  (the backend enforces the same 30-minute cutoff).

UI follows the Figma mockups. Deviations required by the organizers: no −/+ and trash controls next to dishes on the
group page, no "Edit my Pre-Order", yellow plate instead of the "Maria has filled…" notification.

## Quick start

```bash
npm ci                 # not `npm install` — the lockfile is authoritative
npm start              # http://localhost:4200 (development config, dev API URL baked in)
```

Production build (`BACKEND_URL` is mandatory, the build aborts without it):

```bash
BACKEND_URL=https://<api-id>.execute-api.<region>.amazonaws.com/develop npm run build
```

`prebuild` generates `src/environments/environment.production.ts` from `BACKEND_URL` (never committed);
`postbuild` fails if any `BACKEND_URL_PLACEHOLDER` is left in `dist/`.

Deploy:

```bash
aws s3 sync dist/restaurant-frontend-app/browser s3://<bucket> --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

## Quality gates

```bash
npx tsc -p tsconfig.app.json  --noEmit
npx tsc -p tsconfig.spec.json --noEmit
BACKEND_URL=https://example.com npm run build     # ends with "Bundle check passed"
npm test -- --watch=false
```

Current state: 389 tests passing, initial bundle 664.79 kB (error budget 1 MB).
Project conventions and known debt are described in [`CLAUDE.md`](./CLAUDE.md).

## Known limitations (backend-dependent)

These parts of the mockups are **not implemented** because the deployed API does not expose the data they need:

| Mockup state | Why it is missing |
|---|---|
| Red "unconfirmed items… will be canceled in 15 minutes" strip (T-45) | The backend has no T-45 auto-cancel; it only enforces a 30-minute modification cutoff. Showing the text would promise something that never happens. |
| Per-dish **Confirmed / Rejected** badges | Order responses (`GET /orders`, group sessions) return only `dish` and `quantity`; the item `state` exists in storage but is not returned. |
| "New pre-order added" modal | Depends on the per-item state above. |

Unblocking them needs a backend change (return `state` in `OrderItemResponse`, add the T-45 job) and a `syndicate deploy`
by the backend owner; the frontend will then only need the rendering.

Other notes: the backend cannot be run locally, so the frontend always works against a deployed API Gateway URL.
