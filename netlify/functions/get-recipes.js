// Returns the full shared recipe collection as a JSON array.
const { getStore } = require("@netlify/blobs");

exports.handler = async () => {
  try {
    const store = getStore("morgan-recipes");
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
      body: JSON.stringify({ error: "Could not load recipes", detail: String(err) }),
    };
  }
};
