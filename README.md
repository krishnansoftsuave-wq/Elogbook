# ELogbook

Frontend for the **AI-Powered E-Logbook Platform** — intelligent shift
management and operational insights for Oman LNG: AI shift summaries, a
bilingual (English/Arabic) assistant with cited answers, pending-action
tracking, trends and reporting.

The client-approved requirements baseline and the delivered design prototype are
maintained separately and distributed to the team out of band — they are not
part of this repository. Read the relevant section before building a feature and
cite the requirement ID (`FR-…` / `NFR-…`) in your branch, commit and PR.

## Getting started

```bash
npm install
cp .env.example .env.local   # then point NEXT_PUBLIC_API_BASE_URL at your API
npm run dev                  # http://localhost:3000
```

The frontend expects a backend at `NEXT_PUBLIC_API_BASE_URL`. The endpoints it
calls are listed in `src/constants/api.ts`. Auth works out of the box against
the bundled mock below; the `/users` and `/entries` lists have no mock and will
surface a connection error toast until a real backend is running.

> `NEXT_PUBLIC_API_BASE_URL` is also read at **build time** by `next.config.ts`
> to derive the CSP `connect-src`. Changing it needs a rebuild, not a restart.
> Set an **absolute** URL. The build only throws for a value it cannot parse at
> all; empty or scheme-less values build cleanly and then silently block every
> API call, because `connect-src` never gains the host you meant.

## Mock auth layer

`authentication_flow.md` documents the backend's auth contract, but the real
AD FS sign-on is not wired up yet (tracker **A-01**). So the repo ships its own
mock of that contract as Next.js route handlers, letting the whole session
pipeline — axios, interceptors, the Zod boundary, the guards — run for real
against real HTTP status codes.

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

| Endpoint | Auth | What it does |
| -------- | ---- | ------------ |
| `POST /api/v1/dev/token` | none | Mints a 15-minute bearer token. `422` for an unknown AD group. |
| `GET /api/v1/me` | bearer | The session: roles, permissions, area scope. `401` for a missing, invalid, expired or unmapped token. |
| `GET /api/v1/health` · `GET /api/v1/ready` | none | Liveness/readiness, shapes per §7. |
| `GET /api/v1/shifts/current` | bearer + `shift:read` | The live shift, computed from server time. **`403`** for a valid token without `shift:read`. |

Every response — success or error — is wrapped in the contract's
`{ success, data | error, meta }` envelope.

`shifts/current` is the only endpoint in the contract that gates on a
permission, which makes it the only one that can produce a `403` — the branch
where the token is fine and just *this* action is not. It has no query hook or
screen yet: the shift/home screen that will consume it is out of the auth flow's
scope. The endpoint, its schema (`features/shifts/schemas.ts`) and its
computation (`mocks/shifts/current.ts`) ship anyway, because §7 specifies it and
because without it nothing can exercise §3's `403` rule end to end.

The shift arithmetic is the part worth knowing: 12-hour shifts opening at 06:00
**plant time** with a 15-minute overlap (§7, FR-HOME-03), so **05:59 on the 30th
belongs to the night shift that opened at 18:00 on the 29th** — `20260729-N`,
not `20260730-N`. `mocks/shifts/current.test.ts` pins every boundary.

Two things about that sentence changed in Phase 3b, and both were defects:

- **Plant time, not UTC.** `Asia/Muscat` is GST (UTC+4, no DST), and FR-HOME-03's
  "06:00" is an Omani control room's clock. Computing at 06:00 UTC and rendering
  through `formatPlantTime` put *"Day shift · 10:00–22:00 GST"* on the dashboard
  for three phases. The wire value is still a UTC instant with a `+00:00` offset,
  as §7 shows; only the arithmetic moved. See `mocks/shifts/constants.ts`.
- **The boundary is configurable and now actually configured.**
  `currentShift(at, config)` takes the stored `shiftConfig`, so `/admin/shift-config`
  moves the dashboard banner, the window a generated summary covers and the shift
  id on an assistant citation — FR-HOME-03's *"report/summary generation aligns to
  them"*. It was stored and ignored before.

### Test accounts

The sign-in button always signs you in as **`said.albusaidi`** (the Operator).
To become anybody else, use the **role switcher at the foot of the sidebar** —
dev-only scaffolding that replaced the old account picker. Passwords do not
exist; AD group membership is the whole identity.

| Username | Groups | Resolves to |
| -------- | ------ | ----------- |
| `said.albusaidi` | `OLNG-ELOG-OPERATORS` | operator |
| `fatma.alharthy` | `OLNG-ELOG-SUPERVISORS` | supervisor |
| `khalid.almamari` | `OLNG-ELOG-SUPERINTENDENTS` | management |
| `noura.alkindi` | `OLNG-ELOG-ADMINS` | administrator (`["*"]`) |
| `yousuf.alrawahi` | `OLNG-ELOG-SUPERUSERS` | super_user |
| `maryam.alzadjali` | `OLNG-ELOG-OPERATORS` + `OLNG-ELOG-SUPERINTENDENTS` | operator + management, permissions unioned |
| `hamed.alsiyabi` | `OLNG-CONTRACTORS` | **nothing** — `/me` answers `401` "not mapped to any platform role" |

> `hamed.alsiyabi` cannot get a token from `POST /dev/token`: §4 rejects any
> group outside the roles table with a `422` before minting. Choosing him in the
> role switcher therefore fails one step earlier than it will against real AD
> FS, which issues a token and lets `GET /me` answer the `401`.
> `/auth/callback` treats both as the same refusal and shows the same screen.
> Mint a token directly with `mintMockToken()` to drive the `401` shape itself.
>
> He is listed in the switcher **on purpose**: §5's deny path has to stay
> reachable by clicking, not only by typing a callback URL. The `422` is thrown
> before the token lands, so a refused switch leaves the session you were
> already in intact.

## Sign-in screens

There is **no email/password form**. §1 of `authentication_flow.md` is explicit
that the backend "never stores passwords and never authenticates a
username/password itself", and the delivered prototype's login screen is a
single SSO button. The chain is shaped like the real OAuth redirect so that
cutover is mechanical:

| Route | What it is | Production |
| ----- | ---------- | ---------- |
| `/auth/login` | The prototype's welcome screen and one "Sign in with Oman LNG Account" button, which redirects straight to the callback as the default account. | ships |
| `/auth/callback` | Where the chain lands: exchanges for a token, calls `GET /me`, then forwards to `safeReturnTo(returnTo)` or `homeForSession(permissions)`. | `404` |
| `/auth/access-denied` | §5's deny screen, verbatim. Ungated — it is `homeForSession`'s fallback, so it has to answer without a session. | ships |

At cutover, `/auth/login`'s button points at the real AD FS authorize URL and
AD FS lands on `/auth/callback` with `code` + `state` instead of `account`. The
route does not move; only the exchange call inside it does.

### Switching identity — `DevRoleSwitcher`

An invented `/auth/mock-adfs` "Choose an account" screen used to sit between the
button and the callback. It is gone. The prototype puts a **role control at the
foot of the sidebar** (`app-source.txt` 246–276) and that is where choosing an
identity now lives: an avatar, the current role, and a menu that opens upward
listing every mock account with `aria-checked` on the current one.

Selecting one navigates back through `/auth/callback?account=…`, so a switch is
the **same** exchange a fresh sign-in runs — token minted, cache cleared before
it lands, `GET /me` re-read, then `homeForSession` so a role that cannot reach
the current screen never bounces off it. Nothing about the session is cached in
Zustand; `GET /me` stays the source of truth.

Two things to know:

- **It does not ship.** `Sidebar` guards it with `process.env.NODE_ENV !==
  "production"`, which folds at build time and lets the module be tree-shaken;
  the component repeats the test as a second line of defence. Verified against a
  production build — none of its strings appear in `.next/static/chunks`.
- **It is not the product's role switcher.** `AGENTS.md` and `SCREENS.md` both
  say a free switcher is admin impersonation behind a permission gate. That
  control is **unbuilt**; this is scaffolding, and it only exists at `lg` and
  above because `Sidebar` is `max-lg:hidden`.

The prototype draws the sign-in surface in **two** shapes, and both live in
`features/auth/components/AuthScreen.tsx`:

- `AuthSplitScreen` — the gradient brand panel beside a centred column
  (`app-source.txt` 2271–2285). Used by the login, mock AD FS, deny and failure
  screens. Below `lg` the 42% panel becomes a compact gradient bar, since the
  prototype is authored at 1440×900 only and the engagement needs 375/768/1440.
- `AuthBarScreen` — the 54px teal bar above a centred ring spinner (2259–2268).
  Used while the callback is exchanging a token; it deliberately rehearses the
  application top bar the user is about to land on.

`/auth/layout.tsx` is a **passthrough**, not a shell. `/auth/callback` alone
needs both shapes — the bar while it works, the split when it is refused — and a
segment layout wraps every child identically.

> **The dev-only screens cannot render in production.** Both call `notFound()`
> when `process.env.NODE_ENV === "production"`, which Next replaces with a
> string literal at build time, so the branch folds away. A `NEXT_PUBLIC_*` flag
> was considered and rejected — it ships to the browser and could be flipped on
> against a production build. `playwright.config.ts` runs `npm run dev`, so the
> mock is present in the default e2e run; against `PLAYWRIGHT_BASE_URL` pointing
> at a production build those specs correctly 404.

A `403` is not a `401`: the axios interceptor deliberately leaves it alone, so
the session survives and the caller renders a permission-denied state in place
(§3, §8.6). `components/layout/PermissionDenied.tsx` is that state, ready and
tested — but **nothing renders it yet**, because no screen in this scaffold
issues a permission-gated read. `GET /shifts/current` is the endpoint that
produces the `403` (sign in as `yousuf.alrawahi`, who holds `user:read` but not
`shift:read`); the first screen to read it should render `PermissionDenied`.
Only a `401` ends the session — and not while the browser is anywhere under
`/auth`, so the callback keeps its own deny message on screen instead of being
bounced to the login form.

### No refresh-and-retry interceptor

`AGENTS.md` §3 describes an axios interceptor that, on a `401`, queues the
concurrent requests, refreshes the token once and replays them. **This repo does
not do that, on purpose.** §9 of `authentication_flow.md` is explicit that no
refresh endpoint exists — auth is stateless and a 15-minute token is re-obtained
by re-authenticating — so the queue-and-replay machinery would have nothing to
call. `src/lib/api-client.ts` instead ends the session on a `401` and leaves a
`403` untouched, and `api-client.test.ts` pins that a `401` produces exactly one
request and no replay. If a refresh endpoint ever lands, that is the moment to
build what `AGENTS.md` describes.

## Mock operational data

The auth mock above proved the session pipeline. The same machinery now serves
the prototype's operational entities, so every screen can be built against the
real architecture — `API_ENDPOINTS` → `api` → `schema.parse()` → `useQuery` —
before the backend exists. When it lands, only the base URL changes.

| Endpoint | Verb | Permission | Requirement |
| -------- | ---- | ---------- | ----------- |
| `/actions` | `GET` | `action:read` | §7.6 |
| `/actions/:id` | `GET` | `action:read` | §7.6, audited (FR-ADM-05) |
| `/actions/:id/status` | `PATCH` | `action:write` + workflow | FR-PA-04, **FR-PA-05** |
| `/actions/:id/owner` | `PUT` | `action:assign` + workflow | **FR-PA-05**, §6.2(a) |
| `/actions/:id/comments` | `GET` `POST` | `action:read` (+ toggle for Operators) | FR-SUM-08, §6.1 |
| `/suggestions` | `GET` | `action:read` | FR-PA-01 |
| `/suggestions/:id/confirm` | `POST` | `action:confirm` | FR-PA-02 |
| `/summaries` | `GET` `POST` | `summary:read` | FR-SUM-02, **FR-SUM-04** |
| `/summaries/:id` | `GET` | `summary:read` | FR-SUM-01, FR-SUM-06 |
| `/summaries/:id/comments` | `POST` | `summary:read` (+ toggle for Operators) | FR-SUM-08 |
| `/notifications` | `GET` | authenticated | FR-NOT-01 |
| `/notifications/:id/read` | `POST` | authenticated | FR-NOT-01, NFR-12 |
| `/assistant/query` | `POST` | `assistant:query` | FR-AI-01/03/05/06 |
| `/trends` | `GET` | `report:read` | §7.7, FR-AN-02 |
| `/decisions` | `GET` `POST` | `analytics:read` | §6.3 — *no FR-ID exists* |
| `/decisions/:id` `…/status` `…/comments` | `GET` `PATCH` `POST` | `analytics:read` (+ workflow) | §6.3(a)/(b) |
| `/requests*` | — | wildcard / own | ⚠️ **no BRD basis** — see below |
| `/users` | `GET` | `user:read` | FR-ADM-01, §6.5 |
| `/users/:username` | `GET` `PATCH` | read: `user:read` · write: `*` | FR-ADM-01, FR-AUTH-04 |
| `/admin/workflows` | `GET` `PATCH` | read: any · write: **per switch** | FR-PA-05, FR-SUM-08, FR-ADM-06, FR-DASH-03 |
| `/admin/shift-config` | `GET` `PUT` | read: any · write: `*` | FR-HOME-03 |
| `/admin/notification-permissions[/:username]` | `GET` `PUT` | `*` | FR-NOT-01 |
| `/audit` | `GET` **only** | `*` | FR-ADM-05, FR-OBS-01, §9.3 |
| `/dashboards/widgets[/:id]` | `GET` `PUT` | read: any · write: `dashboard:configure` | FR-ADM-06, FR-DASH-01 |

Eight things worth knowing before reading the code:

- **The user directory mirrors Active Directory: there is no `POST /users` and
  no `DELETE`.** FR-ADM-01 asks for "create, modify, remove", but FR-AUTH-02
  makes AD the system of record and `resolveSession` derives roles from the AD
  groups on the token — so an account minted here would carry none and could
  never sign in. Creating and removing people are AD-side actions; FR-ADM-01's
  create/remove is reported unmet rather than faked. `PATCH /users/:username`
  takes **`status` only**, and is a `z.strictObject` so a body carrying `roles`
  or `ad_groups` is a `422` naming the field rather than a silent no-op.
  ⚠️ Suspension is recorded and audited but **not yet enforced** — nothing in
  the auth path reads the collection.
- **Writes persist.** `src/mocks/store.ts` holds a mutable store pinned to
  `globalThis`, so `invalidateQueries` → refetch returns the value you just
  wrote — the same sequence the real API will drive. Without it, mutation hooks
  would have to be written in a way that gets deleted at cutover. A `next dev`
  restart reseeds; nothing touches disk. **Any test that writes must call
  `resetMockStore()` in `beforeEach`.**
- **The workflow toggles seed OFF, and who may flip one is decided per switch.**
  FR-PA-05 and §6.2(a) make assignment and tracking opt-in, and §6.3(a) makes
  decisions record-only, so `/actions/:id/status`, `/actions/:id/owner` and
  `/decisions/:id/status` answer `403` until somebody flips the switch. The
  prototype's own admin cards print `Default: OFF`; only its seed `state`
  disagreed. Writing is **not** one permission for all four: §6.5, the §4 role
  table, FR-ADM-06 and FR-DASH-03 all give the **Super User** control of
  *"access to comments and the decision workflow"*, while FR-PA-05 reserves
  action assignment to the *"Administrator"*. `WORKFLOW_PERMISSION` in
  `features/admin/schemas.ts` is that map, and both the handler and the cards
  read it.
- **Entity field names are PROVISIONAL.** They are derived from the prototype's
  mock `state` (`app-source.txt` 36–123), not from a backend contract, and every
  `schemas.ts` says so. The §3 **envelope** is not provisional.
- **The audit trail fills up as you use the product.** Sixteen handlers call
  `recordAudit`, including `POST /dev/token` — click through a demo, then open
  `/admin/audit`. Two of FR-ADM-05's five named categories have no emitter and
  are reported unmet rather than faked: `EXPORT_REPORT` (no export endpoint
  exists anywhere in this build, so **FR-REP-06** is not met) and `LOGOUT`
  (`authentication_flow.md` §9 — auth is stateless and there is no logout
  endpoint to audit). A **failed** sign-in is reproducible: sign in as
  `hamed.alsiyabi`, who exists in AD and is entitled to nothing.
- **Comment access is gated on a permission, never on a role name.** Both comment
  endpoints ask `summary:comment` **or** the Administrator toggle. An earlier
  role-shaped gate ("are all this session's roles `operator`?") failed *open* for
  the multi-role fixture account, and BRD §4 warns the role list is not final —
  so any gate keyed on a closed set of names widens with every role added.
- **Writes are idempotent (NFR-12).** Regenerating a shift's summary replaces it
  rather than minting a colliding id; confirming a suggestion twice records one
  entry, keyed by `suggestion_id`; a read receipt is scoped to its addressee.
- **`/requests` has no BRD basis at all.** It is in the prototype and in no
  functional requirement, persona flow or scope table. Owner decision
  2026-07-31: contract only, **no screens**, no FR-ID cited, pending client
  confirmation.

### Cutover

The mock is deliberately easy to remove — that is the design constraint it was
built under:

1. Repoint `NEXT_PUBLIC_API_BASE_URL` at the real backend
   (`http://localhost:8000/api/v1`) and **rebuild**.
2. Delete `src/app/api/`, `src/mocks/` and
   `src/features/auth/components/DevRoleSwitcher.tsx` (plus its call site in
   `Sidebar.tsx`, which is one guarded line). Every
   `features/*/schemas.ts` **stays** — they are the response contracts, not
   mocks, which is why `src/mocks/` imports *from* them and never the reverse.
3. In `src/features/auth/components/CallbackExchange.tsx`, replace the
   `/dev/token` exchange with the real AD FS code exchange and drop the
   `findMockAccount` lookup and the stub-only `422` branch.

Only the route handlers and the two dev-only screens above import from
`src/mocks/` — and those screens 404 in a production build, so nothing that
ships can reach it. Every other consumer talks to `API_ENDPOINTS` over the
shared axios instance and cannot tell the difference.

> **The mock cannot run in production.** Every handler returns `404` when
> `NODE_ENV === "production"` — which is contract-accurate, since §4 says
> `/dev/token` "will 404 the moment real AD FS is wired in". The token it issues
> is an unsigned base64url JSON blob, **not a JWT**, and is not secure by design;
> `src/mocks/auth/token.ts` names the one function that changes at cutover.

## Theme

The palette in `src/app/globals.css` is the NYX prototype's `C` object
(prototype source line 2) mapped onto shadcn's token slots. Every hex is quoted
from the prototype and carried in a comment beside its oklch value, so the file
diffs against the prototype without a converter. The development standard names
the prototype as where ELogbook's colours come from (DS-9.3 is 🏷
product-specific), so this is the sanctioned source.

**Never hardcode a hex.** Use the tokens:

| Token | Prototype | Use |
| ----- | --------- | --- |
| `--primary` | `C.teal`, AA-adjusted | Fills, and text on `--card` |
| `--brand-surface` | `C.teal`, AA-adjusted | The top bar and the logo tile. **Identical in both themes** |
| `--brand-dark` | `C.tealDk` `#0A625B` | Teal *text* on a tinted surface |
| `--brand-subtle` / `--accent` | `C.active` `#E4F1EE` | Active nav row, icon discs |
| `--brand-gradient` | `linear-gradient(155deg,…)` | The sign-in brand panel |
| `--on-brand` / `--on-brand-muted` | `#FFFFFF` / `#BFE6E0` | Text on a brand surface |
| `--auth-surface` | `#F3F6F5` | The sign-in page background |
| `--border` / `--border-subtle` | `C.bd` / `C.bd2` | Rules and dividers |

Two rules the palette imposes, both measured rather than assumed:

- **Teal text on a tinted surface uses `--brand-dark`, not `--primary`.**
  `#0D857B` on `--background` is 3.99:1 — fine as a focus ring (3:1), short of
  AA for text. `#0A625B` measures 6.38:1. The prototype makes the same
  distinction: its active nav label is `tealDk`.
- **`--brand-surface` does not flip with the theme.** A brand surface is where
  the product states its identity; `--primary` flips to the dark theme's
  brighter teal, which would drop the logo tile's letter to 2.59:1.

### Two deliberate deviations from the prototype, both WCAG

The testing standard marks WCAG 2.1 AA [ENFORCED], and the prototype misses it
twice. Both were changed, and only these two:

| Prototype | Measured | Shipped | Why |
| --------- | -------- | ------- | --- |
| `--primary` `#0E8C81` under white | **4.13:1** | `#0D857B` (4.51:1) | It is the login CTA's background. 2.5 L\* darker — under the just-noticeable difference for non-adjacent patches. Owner decision, 2026-07-30. |
| `C.mut2` `#9BADA9` on white | **2.35:1** | `--muted-foreground` `#5E726E` (5.11:1) | The signing-in screen's second line. Same role in the hierarchy, a legible weight of grey. |

Dark mode is **derived, not transcribed** — the prototype has no dark theme (see
its documented gaps), but this repo ships a toggle and the code quality standard
requires every surface to work in both. It is the same teal family at the same
hue (~183–186) on dark surfaces; only lightness moves. All 36 token pairs clear
AA in both themes.

## Access control

Gating is **permission-based, never role-based**. `authentication_flow.md` §5 is
explicit: check `permissions.includes("action:write")` (or `"*"`), not
`roles.includes("operator")` — an Administrator can create a custom role through
the admin API, and a build that gates on role names would lock that user out
until a redeploy. Role names are display text and nothing more.

One table drives every gate. `ROUTE_PERMISSIONS` in `src/constants/routes.ts`
maps a route subtree to the permissions it demands, and the layout guards, the
sidebar filter, the root redirect and the edge proxy all read it:

| Route subtree | Requires |
| ------------- | -------- |
| `/admin/**` | `user:read` |
| `/admin/workflows/**` | `user:read` + `access:control` |
| `/admin/audit/**` | `*` |
| `/admin/shift-config/**` | `*` |
| `/dashboard/**` | `shift:read` |
| `/notifications/**` | `shift:read` |
| `/logbook/**` | `shift:read` |
| `/actions/**` | `shift:read` + `action:read` |
| `/summaries/**` | `shift:read` + `summary:read` |
| `/assistant/**` | `shift:read` + `assistant:query` |
| `/trends/**` | `shift:read` + `report:read` |
| everything else | nothing |

Two rules that table encodes, both learned from bugs:

- **The longest matching prefix wins.** `/admin/workflows` is the first nested
  entry. It requires `access:control` — the permission §6 grants the Super User
  and, until Phase 3a, the only one of theirs that gated nothing anywhere. It is
  *not* the wildcard: an earlier build made that mistake, quoting §6.5's fifth
  bullet ("Can view users") while its fourth grants exactly this screen.
- **A policy records a route's *effective* requirement**, its own plus every
  ancestor guard's. `homeForSession`, the sidebar filter and the edge proxy all
  answer from this table and none of them can see a layout, so an entry listing
  only the leaf permission produced a live infinite redirect.

> ⚠️ **This mapping is provisional.** The contract lists the permissions and says
> to gate on them, but neither it nor the BRD says which of *this repo's* routes
> each one gates. It needs client confirmation; correcting it is an edit to that
> one table.

Three layers, per [`AGENTS.md`](./AGENTS.md) §3:

1. **`src/proxy.ts`** — the edge, explicitly best-effort. It reads one
   non-secret presence cookie (`elogbook_session=1`) and nothing else. It cannot
   know a role or a permission, by design: the previous build kept the role in a
   client-writable cookie and let the edge route on it, which made a forged
   string a privilege decision. Next.js' own guide says Proxy "should not be used
   as a full session management or authorization solution".
2. **`src/components/layout/RoleGuard.tsx`** — the authoritative client check.
   **The name is deliberately unchanged**: the architecture and security
   standards both name this file as "the authoritative check", so renaming it
   would leave those documents pointing at a file that no longer exists. Only
   its prop changed — `allow={[role]}` became `require={[permission]}`.
3. **The backend** — the real authority. FR-ADM-03 requires RBAC enforced
   independently at the API *and* the UI; hiding a nav item is not access
   control, and the sidebar filter is cosmetic.

A wrong-permission visit goes to `homeForSession(permissions)` — the most
privileged route that session can actually enter — never to a dead-end
`/unauthorized` page. Because that answer is derived from the same table the
guard reads, a redirect can never target a route the guard would bounce again.

Any `returnTo` is validated by `safeReturnTo` in `src/lib/auth/returnTo.ts`
before it is navigated to: same-origin path only, rejecting `//host`, `/\host`,
absolute URLs, `javascript:`/`data:` payloads, percent-encoded escapes and
control characters the URL parser strips.

## Scripts

| Command                | What it does                                              |
| ---------------------- | --------------------------------------------------------- |
| `npm run dev`          | Development server                                        |
| `npm run build`        | Production build                                          |
| `npm run start`        | Serve the production build                                |
| `npm run type-check`   | TypeScript, no emit                                       |
| `npm run lint`         | ESLint (`lint:fix` to autofix)                            |
| `npm run format`       | Prettier write (`format:check` to verify)                 |
| `npm run test`         | Vitest unit tests (`test:watch`, `test:coverage`)         |
| `npm run test:e2e`     | Playwright end-to-end (`test:e2e:ui` for the runner UI)   |
| `npm run verify`       | lint + format:check + type-check + test + build           |

Run `npm run verify` before opening a PR.

Playwright needs its browser once per machine: `npx playwright install chromium`.

**The e2e suite runs on one worker**, and that is deliberate — every spec talks
to the same `next dev` process, and `src/mocks/store.ts` pins its state to
`globalThis`, so parallel spec files are not isolated from one another. Two files
asserting opposite states of one workflow toggle, or resetting the store while
another is mid-write, produce failures that look like real regressions and are
not. `playwright.config.ts` records the detail. Expect ~6 minutes for the full
suite; a single file is seconds.

[`docs/CI-CD-COMMANDS.md`](./docs/CI-CD-COMMANDS.md) is the full command
reference for pipeline authoring — install, env vars, gates, and the three gaps
`npm run verify` does not cover. End-to-end tests are out of its scope.

## Stack

Next.js 16 (App Router) · TypeScript 5 strict · TanStack Query v5 · Zustand ·
Axios · Zod · Tailwind CSS 4 (sole styling approach) · shadcn/ui (Base UI) ·
TanStack Table v8 · React Hook Form · Sonner · Vitest + Playwright

## Layout

```text
src/
├── app/          # routes only — no business logic (api/v1/* is the mock backend)
├── features/     # the unit of organization: api/, components/, schemas.ts
├── components/   # ui/ (generated shadcn), data-table/, layout/
├── store/        # authStore, settingsStore — nothing else
├── lib/          # api-client, api-error, query-client, zod, auth/
├── mocks/        # the mock backend — store.ts, handler.ts, data/; deleted at cutover
├── constants/    # api.ts, roles.ts, permissions.ts, routes.ts
├── types/        # shared cross-feature types (actor.ts, operations.ts)
└── proxy.ts      # edge auth check (renamed from middleware.ts in Next 16)
```

`src/features/users` is the reference implementation — copy its shape when
adding a feature.

Feature folders carrying a contract but no UI yet: `actions`, `summaries`,
`notifications`, `assistant`, `decisions`, `requests`, `admin`, `audit`,
`dashboards`. Each holds the `schemas.ts` its screens will consume; `api/` and
`components/` arrive with the screens.

## Requirements

The client-approved BRD (v1.3) is the product authority — full wording plus a
condensed product-context summary. It is **not held in this repository**; ask the
team lead for the current copy. Cite the requirement ID (`FR-…` / `NFR-…`) in
your branch, commit and PR rather than paraphrasing from memory.

> The signed `ELogbook-BRD-v1.3.pdf` wins any disagreement with the
> transcription.

Product constraints that bind almost every change: **on-premises, no external
network egress**; **English + Arabic with full RTL**; **read-only against source
systems**; **RBAC enforced at API *and* UI**; all roles **read-only by default**.

## Design reference

The delivered NYX prototype is the **visual and behavioural spec** for every
screen. It is distributed separately from this repository and consists of:

| File | What it is |
| ---- | ---------- |
| `SCREENS.md` | **Start here.** Screen index — every route mapped to a line range, plus entities, shared helpers and known gaps. |
| `app-source.txt` | The extracted prototype app (2,303 lines of plain React). This is what you read. |
| `NYX-E-Logbook-Prototype-V2.1.html` | The delivered bundle (1.7 MB, self-extracting). Open in a **browser** to see it run — it is a gzipped base64 payload, not readable source. |
| `extract.mjs` | Regenerates `app-source.txt`. Run it when a new version lands, then diff to see which screens changed. |

Take **layout and behaviour** from the prototype and **implementation shape**
from the developer guide — the prototype uses inline styles, hardcoded hex,
Material Icons and mock state, all of which break gates here.

It does **not** cover Arabic/RTL, loading/error states, real auth, accessible
chart equivalents, or any breakpoint other than 1440×900. Those are design work
still owed, not omissions to fill in ad hoc.

## Code standard

The signed **Development Standard Checklist** — 161 items, citable as
`DS-<section>.<item>` — is maintained outside this repository, as a full
transcription plus the signed PDF. Read its §0 first; the PDF wins any
disagreement.

Ratified **verbatim** on 2026-07-30, which places it **above the developer
guide**: BRD → prototype → checklist → developer guide.

> ⚠️ The checklist was authored for a different product (its title page reads
> *"ThinkArguments LMS"*) and mandates **Redux Toolkit**,
> `src/interfaces/index.ts`, no CSS Modules, per-component folders and
> `src/components/common/` — the opposite of what this repo does. Those are
> **standing conflicts awaiting an owner decision**, catalogued in §0. Keep
> building the way the developer guide describes, cite the `DS-` ID, and
> escalate; never start the migration. `DS-1.4` (90 cols), `DS-1.5` (single
> quotes) and `DS-15.4`/`DS-15.5` (`feature:`) were explicitly declined —
> committed config stands.

## Conventions

Architecture rules, the state-ownership model and the pre-PR checklist live in
the developer guide, alongside the product context. Read both before adding a
feature; ESLint enforces the parts that can be enforced.

Commits follow Conventional Commits (`feat(scope): …`), checked by commitlint.
Husky runs lint-staged on commit and type-check + test + build on push.
