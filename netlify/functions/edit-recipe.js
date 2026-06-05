const { openStore } = require("./_store");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Bad request" }) };
  }
  const { id, title, tags } = body;
  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: "id required" }) };
  }
  if (title !== undefined && (typeof title !== "string" || !title.trim())) {
    return { statusCode: 400, body: JSON.stringify({ error: "title must be a non-empty string" }) };
  }

  try {
    const store = openStore();
    const existing = (await store.get("all", { type: "json" })) || [];
    const list = Array.isArray(existing) ? existing : [];
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) {
      return { statusCode: 404, body: JSON.stringify({ error: "Recipe not found" }) };
    }

    if (title !== undefined) list[idx].title = title.trim().slice(0, 160);
    if (tags !== undefined) {
      list[idx].tags = Array.isArray(tags)
        ? tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 20)
        : [];
    }

    await store.setJSON("all", list);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipe: list[idx] }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Could not update recipe", detail: String(err) }),
    };
  }
};
