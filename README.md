# Blood Link (React)

A React + Vite port of the Blood Link demo — a regional blood-bank coordination
prototype for Jammu & Kashmir, Ladakh and Punjab. Same look, same behavior as
the original single-file build: maroon/light theme, a full login/signup gate,
role-based sidebar (Blood Centre vs Donor), and 8 dashboard views — all backed
by `localStorage`, no server.

## Run it locally

```bash
npm install
npm run dev
```

Open the printed `http://localhost:5173` URL.

## Build

```bash
npm run build
```

Outputs a static site to `dist/`. `npm run preview` serves that build locally
if you want to sanity-check it before deploying.

## Deploy to Vercel

This is a plain static Vite app — Vercel auto-detects it, no config file
needed.

**Option A — Vercel CLI**
```bash
npm i -g vercel
vercel login
vercel          # first deploy, follow the prompts
vercel --prod   # subsequent production deploys
```

**Option B — Git import**
1. Push this folder to a GitHub repo.
2. In the Vercel dashboard: **Add New → Project → Import** your repo.
3. Framework preset: **Vite** (auto-detected). Build command `npm run build`,
   output directory `dist` — Vercel fills these in automatically.
4. Deploy.

No environment variables are required — the Google Maps key lives directly in
`src/data.js` as a plain constant (see note below).

## Demo accounts

Password for both: `demo123`

| Role | Email |
|---|---|
| Blood Bank Administrator (GMC Jammu) | `centre@bloodlink.demo` |
| Blood Bank Administrator (SNM Leh) | `leh.bank@bloodlink.demo` |
| Super Administrator | `super@bloodlink.demo` |
| State/UT Administrator (Ladakh) | `ladakh.admin@bloodlink.demo` |
| District Administrator (Jammu) | `jammu.district@bloodlink.demo` |
| Hospital / Requesting Authority (SNM Leh) | `hospital@bloodlink.demo` |
| Health Department Official | `official@bloodlink.demo` |
| Donor | `donor@bloodlink.demo` |

All staff and official roles use the "Staff & Officials Login" tab.

## AI supply-chain intelligence modules

Command Centre, AI Demand Forecasting, Smart Inventory Intelligence, AI Insights,
AI Assistant, Supply Chain Intelligence, Emergency Response, Transfer Management,
Blockchain Ledger, e-RaktKosh Integration, Reports and Administration. All of them
run on a **static, fixed-seed simulated dataset** (`src/networkData.js`). The
analytics live in `src/engine.js`, the ledger is a simulated hash chain
(`src/ledger.js`), and workflows are stored in localStorage (`src/store.js`).
e-RaktKosh is **not** connected.

```bash
npm test   # engine, ledger, access control, assistant and import validation checks
```

Or use "Create an account" on the login page to make your own.

## About the Google Maps key

`src/data.js` exports `GOOGLE_MAPS_API_KEY`. On the **Supply Map & Routes**
page, the app tries to load a live Google Map with that key; if it can't
reach Google (for example, no internet, or the key is restricted to other
domains), it falls back automatically to a built-in schematic diagram — you'll
never see a broken map, just one or the other, labelled clearly at the top of
the panel. Once deployed to your own `https://` domain, make sure that domain
is allowed in your Google Cloud key's **HTTP referrer restrictions** (if any
are set) or the live map will keep falling back to the schematic.

## Project structure

```
src/
  main.jsx          entry point
  App.jsx           top-level: AuthPage vs Dashboard, based on login state
  useAuth.js        localStorage-backed auth (users, session, login/signup/logout)
  Toast.jsx         toast notification provider/hook
  data.js           all seed data (regions, inventory, map nodes, demo users, translations)
  icons.jsx         the SVG icon set used throughout
  AuthPage.jsx       the scrolling login/landing page
  Sidebar.jsx       dashboard sidebar nav (role-gated)
  Dashboard.jsx     dashboard shell: sidebar + topbar + view switcher
  views/
    Overview.jsx, Inventory.jsx, Emergency.jsx, SupplyMap.jsx,
    Forecast.jsx, Donors.jsx, DonorApp.jsx, BuildPlan.jsx
```

## What's demo vs real here

Everything is synthetic sample data, stored only in the browser running the
app (`localStorage`) — there is no backend, no real patients, donors, or
hospitals. This is a working prototype of the *interaction design*, not a
production system.
