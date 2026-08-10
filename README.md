# My Shop App

A mobile-first local marketplace app (feed, search, shop pages, cart, messaging,
notifications, and a seller earnings dashboard) built with React, React Router,
and Tailwind CSS.

## Getting started

```bash
npm install
npm run dev
```

## Supabase backend

The app starts without seeded marketplace content. New accounts receive empty
buyer and seller collections, while real marketplace content is loaded from the
connected backend as those screens are enabled. To connect Supabase:

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/schema.sql` in the Supabase SQL editor to create the
   `profiles`, `categories`, `listings`, `favorites`, `reviews`,
   `conversations`, `messages`, and `notifications` tables with row-level
   security policies.
3. Copy `.env.example` to `.env` and fill in your project URL and anon key:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Restart the dev server. Once configured:
   - `/signin` sends a magic-link email (or Google/Apple OAuth) via
     `src/context/AuthContext.jsx`.
   - `/messages`, `/messages/:id`, and `/profit` require an authenticated
     session (see `src/components/ProtectedRoute.jsx`).
   - The heart/save button on the product page persists favorites to
     Supabase for signed-in users, or to `localStorage` otherwise
     (`src/hooks/useFavorites.js`).
   - `src/lib/api/*.js` contains query helpers for listings, profiles, favorites,
     messages, and notifications. These should be used by screens as backend
     connectivity is enabled; do not add seed or demo records to account flows.

If OAuth providers (Google/Apple) aren't configured in your Supabase project,
disable those buttons or configure them under Authentication → Providers.
