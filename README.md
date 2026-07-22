# Trivto Image Feed

A full-screen, vertically snap-scrolling image feed ("TikTok for photos") built for the Trivto take-home assignment. One image fills the viewport at a time, the feed snaps cleanly on scroll, swipe, or arrow keys, loads more photos as you approach the end, and lets you Like a photo with the state persisted across refreshes.

## Stack

- **Next.js 14 (App Router, TypeScript)** — frontend and backend in one project. `app/api/*` route handlers are the "backend layer you own."
- **Tailwind CSS** — mobile-first styling; CSS `scroll-snap` drives the feed.
- **MongoDB (Mongoose)** — persists Like state.
- **Unsplash API** — real, paginated image data.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the env template and fill it in:
   ```bash
   cp .env.example .env.local
   ```
   - `UNSPLASH_ACCESS_KEY` — create a free app at [unsplash.com/developers](https://unsplash.com/developers) → "New Application" → copy the **Access Key**. This stays server-side; it is never sent to the browser.
   - `MONGODB_URI` — connection string for any MongoDB instance (a free [Atlas](https://www.mongodb.com/cloud/atlas/register) cluster works fine).
3. Run the dev server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000). Resize your browser to a phone-sized viewport (or open it on your phone) — the feed is mobile-first and is meant to be tested narrow.

## How it works

- `GET /api/photos?page=N` — server-side route that calls Unsplash with the secret Access Key, normalizes the response (drops entries missing an image URL or dimensions), and merges in each photo's `liked` state from MongoDB in a single query. The client never talks to Unsplash directly.
- `GET/POST /api/likes` — reads/toggles Like state. A `Like` document's mere existence (`{ photoId, createdAt }`) means "liked" — there's no user auth in scope, so likes are global rather than per-user (see "Deliberate scope decisions" below).
- The feed component fetches page 1 on mount, then uses an `IntersectionObserver` watching the card a few positions before the end of the currently-loaded list to fetch the next page — so the next batch is already in the DOM before you'd ever scroll into empty space.
- Liking a photo updates the UI immediately (optimistic update) and rolls back if the `POST` fails.
- The scroll container is focusable (`tabIndex={0}`, auto-focused on load) so `ArrowUp`/`ArrowDown` scroll it in addition to touch/wheel scrolling.

## Deliberate scope decisions

- **Likes are global, not per-user.** The assignment doesn't ask for accounts/auth, and adding one would be scope creep. A photo is either liked or not, for anyone who opens the app — which is enough to demonstrate real backend-persisted state surviving a refresh.
- **`order_by=latest` on Unsplash** rather than curated/featured, so pagination is close to infinite and predictable for testing.
- **No client-side fallback for likes.** The assignment allows a documented client-side-only fallback, but since a real backend layer was already required for the API proxy, it was cheaper and more honest to also persist likes there rather than add a second, inconsistent storage mechanism.

## What I'd do next with more time

- Smart preloading of the next 1-2 images so a very fast scroll never shows a loading skeleton — not implemented; scoped out to keep the core flow solid within the assignment's time guardrail.
- A "Liked" view listing everything the user has liked (the `GET /api/likes` route already returns the full liked-ID set, so most of the plumbing exists).
- Lightweight tests around the pagination/dedup logic in `components/Feed.tsx`.
- Basic virtualization so a very long scroll session doesn't accumulate hundreds of full-size `<Image>` DOM nodes.
- Per-browser (not global) likes via a lightweight anonymous session cookie, without going as far as full accounts.

## Known issues

- Unsplash's free demo tier is capped at 50 requests/hour; hitting that limit mid-review will surface the app's error state (with a Retry button) rather than a crash — that's the intended "API down/rate-limited" handling, not a bug, but worth knowing if the feed suddenly stops loading more pages during a review session.
- Likes are global/anonymous by design (see above) — refreshing on a different device will show the same liked state, since it isn't tied to a browser or account.

## AI workflow

See [`AI_WORKFLOW.md`](./AI_WORKFLOW.md) for how Claude Code was used throughout this project.
