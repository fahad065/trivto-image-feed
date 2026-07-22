# AI Workflow

This file was written *during* the build, from the actual Claude Code session, not reconstructed afterward.

## Tools used

- **Claude Code** — used for essentially the entire build: reading the assignment, planning the architecture, scaffolding the Next.js project, writing every backend route, the Mongoose model, the feed/scroll-snap frontend, and this documentation. I drove it through Claude Code's plan mode (propose → I approve/redirect → implement) rather than letting it freewheel.
- No other AI tool was used for this assignment (no ChatGPT, no Copilot autocomplete) — keeping to one tool made it easier to have a single, honest trail of prompts instead of stitching together outputs from several sources.

## Representative prompts (verbatim)

**1. Kickoff / requirements analysis** — I pasted the full assignment markdown plus context about the company and role, and asked:
> "This project has nothing to do with WPS and anything. Its completely new task from trivto company. Now I want you to analyze it what they are expecting from me, and how do I start this."

This is where I wanted Claude to do the "reading between the lines" work — what's actually graded vs. what's just described, not just restate the spec back to me. It correctly flagged that AI_WORKFLOW.md is a first-class grading criterion (not a formality) and that the backend's whole job is proxying the key + serving like-state, which shaped the rest of the plan.

**2. Redirecting a suggested default** — Claude asked (via a structured question) whether Like persistence should be SQLite/Prisma, a JSON file, or Redis. None of those fit what I actually wanted, so I answered:
> "Can I use mongodb?"

Claude adjusted the plan to Mongoose/MongoDB without pushback, which is the behavior I wanted — propose a sensible default, but don't fight me when I know what I want to use (MongoDB is already in my day-to-day stack).

**3. Providing infrastructure it can't set up itself** — when asked local-vs-hosted Mongo, I said:
> "I have already a url from free cluster. I will paste it in env var whenever you want."

Claude didn't ask me to paste the URI into chat — it planned for me to put it directly into `.env.local` myself. That's the behavior I want from a tool touching credentials: minimize the surface where secrets pass through the conversation at all.

**4. Where it caught its own mistake (see below).**

**5. Catching a missed requirement during testing** — while verifying the feed in a real browser, Claude noticed on its own that the spec says the feed should respond to "scroll (or swipe / arrow-key)", but the scroll container had no `tabIndex` and wasn't focusable — arrow keys would have done nothing. It flagged this itself rather than me having to catch it, and fixed it (`tabIndex={0}` plus an autofocus effect on the scroll container in `components/Feed.tsx`). I didn't prompt for this specifically; it came up organically while working through the test checklist from the plan, which is the kind of catch I want AI-assisted testing to produce, not just "does it compile."

## Where Claude got something wrong, and how I caught it

While writing `lib/unsplash.ts`, Claude's first draft included:

```ts
blurDataUrl: photo.blur_hash ? null : null,
```

That's a no-op ternary — dead code that always evaluates to `null` regardless of the condition, left over from an earlier plan to decode Unsplash's `blur_hash` into a placeholder image that got abandoned mid-write. It's the kind of thing that reads as "used AI, didn't review the diff." I caught it on a re-read of the file immediately after writing it (before ever running the app), and removed the field entirely — `NormalizedPhoto` doesn't carry a blur placeholder at all now; the loading placeholder is a plain CSS pulse (`animate-pulse`) in `FeedItem.tsx` instead. I did not ask Claude to "fix a bug" after the fact — I read the diff and cut the dead field myself, which is the point: I'm not shipping AI output I haven't actually read.

Separately, in the same review pass, I noticed the `.gitignore` that `create-next-app` generates ignores `.env*`, which would have silently swallowed `.env.example` — the one env-related file that's supposed to be committed. Fixed with a `!.env.example` negation line before the first commit. Small, but exactly the kind of scaffolding default that's easy to ship unreviewed.

## Where I chose NOT to use AI (or overrode its default)

- **Storage/API choices** — Claude suggested SQLite as its recommended default for Like persistence. I overrode it with MongoDB because it's what I already run in production elsewhere; no reason to introduce a second database technology for a 2-day assignment just because it was recommended first.
- **Secrets never enter the chat** — both the Unsplash Access Key and the MongoDB URI are typed directly into `.env.local` by me, never pasted into the conversation for Claude to see or echo back.
- **Verifying against ground truth, not memory** — `create-next-app` on this Next.js version ships an `AGENTS.md` note warning that this Next.js release may differ from an AI's training data. Rather than assuming prior knowledge of the App Router API was still accurate, the route-handler docs bundled in `node_modules/next/dist/docs` were read directly before writing any `route.ts` file, specifically to confirm the `GET`/`POST` export convention and default (uncached) behavior for this version.
- **The actual UX/product calls stay mine** — e.g., deciding likes are global rather than per-user, and picking "smart preloading" as the one stretch goal worth attempting (if time allows) because it reinforces the single most heavily-graded behavior (snap-scroll smoothness) instead of adding a new surface like a saved-view. Claude can enumerate tradeoffs; which one matters for *this* review is a judgment call I made, not it.

## How I verified the code

- Read every file as it was written/edited (not just the final `git diff`) — this is how the dead `blurDataUrl` line and the `.gitignore` gap were caught, both before running anything.
- Ran `npm run dev` and exercised the feed for real in a phone-sized viewport (375×812) — checked scroll-snap smoothness, that the next page fetches before the visible end of the list, and that liking a photo survives a full page refresh.
- Deliberately broke `UNSPLASH_ACCESS_KEY` temporarily to confirm the error state (with Retry) renders instead of the app crashing, then restored it.
- Confirmed neither secret appears in `git log`/`git diff` before the first commit, and that the Unsplash key is only ever referenced from server-side files (`lib/unsplash.ts`, called from `app/api/photos/route.ts`), never from any client component.
- Ran `npx tsc --noEmit` and `npm run lint` after every meaningful chunk of work, not just once at the end. Lint caught a real issue in the initial `Feed.tsx` draft: `eslint-config-next`'s `react-hooks/set-state-in-effect` rule flagged the mount-time data fetch. The fix was to stop setting `status` to `"loading"` redundantly inside the fetch function for the initial call (the state already starts as `"loading"` by default) and to only ever set it explicitly from the Retry button's `onClick` — a real behavioral cleanup, not a suppressed warning.
- Verified infinite pagination end-to-end in a real, foreground Chrome tab: scrolled to the prefetch-trigger card, confirmed `GET /api/photos?page=2` fired automatically, and confirmed the DOM grew from 10 to 20 `<section>`s with zero id overlap between pages (checked programmatically, not just visually).
- Verified the error path by temporarily corrupting `UNSPLASH_ACCESS_KEY` in `.env.local` with `sed` (appending garbage, never printing or viewing the real value) and confirming the API returned a clean `502` and the UI showed the "Couldn't load the feed" / Retry state instead of crashing — then reverted the same way and confirmed recovery.
- One verification limitation worth being honest about: the sandboxed browser-automation tool used for most of this testing runs tabs in a backgrounded/non-OS-focused state (`document.hidden === true`), which throttles `IntersectionObserver` callbacks and blocks synthetic keyboard events from reaching the page — so I couldn't get an automated arrow-key press to register in either automation surface I tried. I didn't take "the tool didn't error" as proof; I fell back to checking the actual computed state that governs the behavior (`tabIndex`, `overflow-y: scroll`, `scroll-snap-type: y mandatory`, and that the container was genuinely the focused element) — that combination is standard, well-documented browser behavior for keyboard-scrollable containers, so I'm confident in it, but I'm not overstating it as something I watched happen pixel-by-pixel.
