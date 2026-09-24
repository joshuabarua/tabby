# Tabby

A guitar song sheet editor — write lyrics, place chords above the exact words
they land on, pick voicings for your tuning, transpose, and export a clean A4
PDF. Songs live in your browser by default; optionally sync to your own
Firebase project with Google sign-in.

![tech](https://img.shields.io/badge/stack-React%2019%20%C2%B7%20Vite%20%C2%B7%20Tailwind%204%20%C2%B7%20Firebase-b4532a)

## Features

- Lyrics editor with chords anchored to character positions (not spaces)
- Chord picker: roots, qualities, slash-bass, free-text search (`Gmaj7`, `D/F#`)
- Chord diagrams — curated shapes plus an algorithmic voicing generator that
  produces correct fingerings for **any** tuning
- Tunings: Standard, Drop D, DADGAD, Open G, Open D, Open E (+ custom data model)
- Capo, transposition (±6), song sections, BPM/key/notes metadata
- Undo/redo, keyboard shortcuts, responsive down to phone width
- Local persistence via IndexedDB — no account needed
- Optional Firebase sync (Google sign-in) for cross-device storage
- JSON import/export, A4 PDF export with chord-diagram block
- PWA: installs and works offline

## Run it yourself

Requires Node 20.19+ or 22.12+.

```bash
git clone https://github.com/joshuabarua/tabby.git
cd tabby
npm install
npm run dev
```

Open http://localhost:5173 — done. No API key needed: without Firebase config
the app runs fully local (IndexedDB + localStorage) and the sign-in button
simply doesn't appear.

### Other commands

```bash
npm test        # unit + smoke tests (vitest)
npm run build   # typecheck + production build → dist/
npm run preview # serve the production build locally
```

## Optional: your own Firebase storage

Your songs, your project — Tabby never phones home to anyone else's backend.

1. **Create a project** at [console.firebase.google.com](https://console.firebase.google.com)
   → Add project → name it anything → Analytics can be skipped.
2. **Register a web app**: Project settings → Your apps → `</>` → copy the
   `firebaseConfig` object.
3. **Give the config to Tabby**, either:
   - paste it into `src/firebase.config.ts`, or
   - copy `.env.example` to `.env.local` and fill in the `VITE_FIREBASE_*` vars
     (useful for CI/secret-based deploys).
4. **Enable sign-in**: Build → Authentication → Sign-in method → Google → Enable.
   Under *Authorized domains*, add your hosting domain (e.g.
   `you.github.io`); `localhost` is allowed by default.
5. **Create Firestore**: Build → Firestore Database → production mode → pick a
   region. In the Rules tab, paste `firestore.rules` (ships with this repo) and
   Publish — it restricts every user to `users/{their-uid}/songs/*`.

Restart `npm run dev`, click **Sign in to sync**, done. Sign-in merges local and
cloud libraries (newest `updatedAt` wins); after that, every autosave writes to
both. Signing out keeps everything on-device.

> Firebase web API keys are safe to commit — access is enforced by the
> Firestore rules, not the key.

## Deploying

`vite.config.ts` sets `base: '/tabby/'` for GitHub Pages. Change it to `'/'` for
a custom domain or root deploy. A ready-made Pages workflow lives in
`.github/workflows/deploy.yml` — push to `main` and it builds and deploys.
Remember to add your Pages domain to Firebase *Authorized domains*.

## Project layout

```
src/
  types.ts            Song / Section / LyricLine / PlacedChord / Chord / Voicing
  lib/
    music.ts          notes, transpose, chord parse/format, chord tones
    voicings.ts       curated shapes + tuning-aware voicing generator
    tunings.ts        built-in tuning library
    layout.ts         chord-line layout shared by preview + PDF
    storage.ts        IndexedDB + prefs
    sync.ts           Firebase read/write + merge
    firebase.ts       app init, Google auth helpers
    song.ts           zod schema, import/export, factories
  state/              song context + undo history
  components/         editor, picker, popover, diagrams, library, preview, pdf
```

## License

MIT
