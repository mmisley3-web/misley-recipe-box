# The Morgan Family Recipe Box

A dynamic, shared recipe collection. Paste a link to any recipe page and it joins
the family box — visible to everyone who opens the page or scans the QR code.

Built to match the *Savoring Our Family Flavors* aesthetic (warm cream / olive / rust,
Fraunces + Albert Sans).

## What's in here

```
index.html                      The page (hero, add-a-link box, live recipe grid, search)
netlify.toml                    Netlify build + functions config
package.json                    Declares the @netlify/blobs dependency
netlify/functions/
  get-recipes.js                Returns the shared collection
  add-recipe.js                 Fetches a pasted link's title/image/description, then saves it
  delete-recipe.js              Removes a recipe by id
```

## How it works

- **Storage:** Netlify Blobs — a built-in key/value store. No external database, no
  signup, nothing to configure. All recipes live under one key (`all`) in a store
  called `morgan-recipes`.
- **Adding a recipe:** when you paste a link, `add-recipe` fetches that page on the
  server and reads its `Recipe` structured data (JSON-LD) plus Open Graph tags to pull
  the title, photo, and description automatically.
- **Sites that block bots:** a few large recipe sites block automated fetches. When that
  happens the page simply asks you to type a name, then saves the link anyway — it never
  just fails.
- **Shared:** everyone sees the same box. There are no accounts; anyone with the URL can
  add or remove recipes (fine for a family collection).

## Deploy to Netlify

### Option A — drag & drop (fastest)
1. Zip the **contents** of this folder (so `index.html` and `netlify/` are at the top
   level of the zip, not inside a subfolder).
2. Go to your Netlify dashboard → **Add new site → Deploy manually** → drop the zip.
3. Done. Netlify installs `@netlify/blobs` and wires up the functions automatically.

> Drag & drop note: if you deploy this way, the dependency in `package.json` is installed
> for you. If you ever see a "blobs" error, use Option B (Git), which always runs the
> install step.

### Option B — connect a Git repo (best for ongoing edits)
1. Push this folder to a GitHub repo.
2. In Netlify: **Add new site → Import from Git** → pick the repo.
3. Leave the build command empty; publish directory is `.` (already set in
   `netlify.toml`). Deploy.

### Local preview (optional)
```
npm install -g netlify-cli
netlify dev
```
This runs the functions and Blobs locally at http://localhost:8888.

## The QR code

Once deployed, take your site URL (e.g. `https://morgan-recipe-box.netlify.app`) and turn
it into a QR code with any free generator. Print it, stick it on the fridge, and anyone
who scans it lands on the live box.

## Customizing

- **Title / wording:** edit the `<header class="hero">` block in `index.html`.
- **Colors / fonts:** the palette lives in the `:root` CSS variables at the top of
  `index.html` — same tokens as the Family Flavors cookbook.
- **Want it private instead of open?** Add a shared passphrase check, or move to
  Netlify Identity. Happy to help wire that up if you want it.

## A note on the data

Recipes are stored as small JSON records (title, url, image url, description, timestamp).
Images aren't copied or hosted — the card just points at the original site's photo URL, so
if a source site removes an image, that card falls back to a placeholder icon.
