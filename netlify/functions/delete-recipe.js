// Removes a recipe from the shared box by id.
const { openStore } = require("./_store");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Bad request" }) };
  }
  const id = (body.id || "").trim();
  if (!id) return { statusCode: 400, body: JSON.stringify({ error: "Missing id" }) };

  try {
    const store = openStore();
    const existing = (await store.get("all", { type: "json" })) || [];
    const list = Array.isArray(existing) ? existing : [];
    const next = list.filter((r) => r.id !== id);
    await store.setJSON("all", next);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, count: next.length }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Could not delete recipe", detail: String(err) }),
    };
  }
};
