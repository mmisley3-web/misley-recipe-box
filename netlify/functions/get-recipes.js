// Returns the full shared recipe collection as a JSON array.
// Credential logic is inlined here (no separate helper) to avoid any chance of a
// stale/mismatched file, and includes a diagnostic for missing env vars.
const { getStore } = require("@netlify/blobs");

const STORE_NAME = "morgan-recipes";

exports.handler = async () => {
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN;

  try {
    let store;
    if (siteID && token) {
      store = getStore({ name: STORE_NAME, siteID, token });
    } else {
      store = getStore(STORE_NAME);
    }
    const data = await store.get("all", { type: "json" });
    const recipes = Array.isArray(data) ? data : [];
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify(recipes),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Could not load recipes",
        detail: String(err),
        // Diagnostic: tells us whether the function can see the env vars.
        diagnostic: {
          sawSiteID: Boolean(siteID),
          sawToken: Boolean(token),
          siteIDLength: siteID ? siteID.length : 0,
          tokenLength: token ? token.length : 0,
        },
      }),
    };
  }
};
