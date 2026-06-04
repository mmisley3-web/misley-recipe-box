// Opens the shared recipe store.
//
// Netlify is supposed to inject the Blobs credentials automatically when a
// function runs. On some deploys (notably manual ones, and some Git builds where
// the auto-config doesn't attach) that injection is missing and getStore() throws
// MissingBlobsEnvironmentError.
//
// To be robust everywhere, this helper uses explicit credentials whenever they're
// available as environment variables, and otherwise falls back to the automatic
// configuration. The store is always opened INSIDE the request handler (never at
// module load), which is required for the automatic path to work.
const { getStore } = require("@netlify/blobs");

const STORE_NAME = "morgan-recipes";

function openStore() {
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN;

  // Preferred: explicit credentials (works on every deploy type).
  if (siteID && token) {
    return getStore({ name: STORE_NAME, siteID, token });
  }

  // Fallback: rely on Netlify's automatic injection.
  try {
    return getStore(STORE_NAME);
  } catch (err) {
    throw new Error(
      "Netlify Blobs isn't configured for this deploy. Add two environment variables " +
      "in Site configuration > Environment variables: NETLIFY_SITE_ID (your Project ID) " +
      "and NETLIFY_BLOBS_TOKEN (a personal access token), then redeploy. " +
      "Original error: " + String(err)
    );
  }
}

module.exports = { openStore };
