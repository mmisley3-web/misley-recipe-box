// Adds a recipe to the shared box.
// If only { url } is sent, it fetches the page and extracts title/image/description.
// If the page can't be read, it responds { needsTitle:true } so the UI can ask for a name.
// If { url, title } is sent, it saves directly (manual fallback).
const { getStore } = require("@netlify/blobs");

function decodeEntities(s) {
  if (!s) return s;
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .trim();
}

function metaTag(html, prop) {
  // matches <meta property="og:title" content="..."> in either attribute order
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeEntities(m[1]);
  }
  return null;
}

function extractFromJsonLd(html) {
  const out = {};
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    let json;
    try { json = JSON.parse(b[1].trim()); } catch { continue; }
    const nodes = Array.isArray(json) ? json : (json["@graph"] ? json["@graph"] : [json]);
    for (const node of nodes) {
      const type = node["@type"];
      const isRecipe = type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
      if (isRecipe) {
        if (node.name) out.title = decodeEntities(String(node.name));
        if (node.description) out.description = decodeEntities(String(node.description));
        let img = node.image;
        if (Array.isArray(img)) img = img[0];
        if (img && typeof img === "object") img = img.url;
        if (img) out.image = String(img);
        return out;
      }
    }
  }
  return out;
}

async function fetchMeta(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MorganRecipeBox/1.0; +https://netlify.com)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 600000); // cap size

    const ld = extractFromJsonLd(html);
    const titleTag = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];

    const title = ld.title || metaTag(html, "og:title") || metaTag(html, "twitter:title") ||
                  (titleTag ? decodeEntities(titleTag) : null);
    const image = ld.image || metaTag(html, "og:image") || metaTag(html, "twitter:image") || null;
    const description = ld.description || metaTag(html, "og:description") ||
                        metaTag(html, "description") || metaTag(html, "twitter:description") || null;

    if (!title) return null;
    return {
      title: title.slice(0, 160),
      image: image,
      description: description ? description.slice(0, 280) : null,
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Bad request" }) };
  }
  const url = (body.url || "").trim();
  if (!/^https?:\/\//i.test(url)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid URL" }) };
  }

  let site = "";
  try { site = new URL(url).hostname.replace(/^www\./, ""); } catch {}

  let meta;
  if (body.title && body.title.trim()) {
    // manual fallback: user supplied the title
    meta = { title: body.title.trim().slice(0, 160), image: null, description: null };
  } else {
    meta = await fetchMeta(url);
    if (!meta) {
      // tell the UI to ask the user for a name
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needsTitle: true }),
      };
    }
  }

  const recipe = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    url,
    site,
    title: meta.title,
    image: meta.image,
    description: meta.description,
    added: Date.now(),
  };

  try {
    const store = getStore("morgan-recipes");
    const existing = (await store.get("all", { type: "json" })) || [];
    const list = Array.isArray(existing) ? existing : [];
    // avoid exact-duplicate URLs
    if (!list.some((r) => r.url === url)) {
      list.push(recipe);
      await store.setJSON("all", list);
    }
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipe }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Could not save recipe", detail: String(err) }),
    };
  }
};
