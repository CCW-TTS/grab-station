// Notion proxy for the Product Grab Station.
// Holds the Notion token server-side so it never reaches the browser.
//   GET  /api/clips           -> { clips: [...] } read from the Creator Clips database
//   POST /api/clips {id,status} -> updates that clip's Status (the enum, not a bool)
//
// Required env vars (Netlify → Site settings → Environment variables):
//   NOTION_TOKEN        - a Notion internal integration secret with access to the DB
//   NOTION_DATABASE_ID  - the Creator Clips database id

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DB = process.env.NOTION_DATABASE_ID;
const NV = "2022-06-28";

async function notion(path, opts = {}) {
  return fetch("https://api.notion.com/v1/" + path, Object.assign({}, opts, {
    headers: Object.assign({
      "Authorization": "Bearer " + NOTION_TOKEN,
      "Notion-Version": NV,
      "Content-Type": "application/json"
    }, opts.headers || {})
  }));
}

// pull plain text out of a title or rich_text property
function txt(prop) {
  if (!prop) return "";
  const arr = prop.rich_text || prop.title;
  return Array.isArray(arr) ? arr.map(t => t.plain_text).join("") : "";
}

function mapPage(p) {
  const P = p.properties || {};
  return {
    id: p.id,
    product: txt(P["Detected Product"]) || "(no product)",
    name: txt(P["Friendly Name"]) || txt(P["Name"]) || "",
    driveLink: (P["Drive Link"] && P["Drive Link"].url) || "",
    driveFileId: txt(P["Drive File ID"]),
    status: (P["Status"] && P["Status"].status && P["Status"].status.name) || "",
    creator: (P["Creator"] && P["Creator"].select && P["Creator"].select.name) || ""
  };
}

function json(code, obj) {
  return { statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}

exports.handler = async (event) => {
  if (!NOTION_TOKEN || !DB) {
    return json(500, { error: "Server not configured: set NOTION_TOKEN and NOTION_DATABASE_ID." });
  }
  try {
    if (event.httpMethod === "GET") {
      let clips = [], cursor;
      do {
        const res = await notion("databases/" + DB + "/query", {
          method: "POST",
          body: JSON.stringify(cursor ? { start_cursor: cursor, page_size: 100 } : { page_size: 100 })
        });
        if (!res.ok) return json(res.status, { error: "Notion query failed", detail: await res.text() });
        const data = await res.json();
        clips = clips.concat((data.results || []).map(mapPage));
        cursor = data.has_more ? data.next_cursor : null;
      } while (cursor);
      return json(200, { clips });
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      if (!body.id || !body.status) return json(400, { error: "id and status are required" });
      const res = await notion("pages/" + body.id, {
        method: "PATCH",
        body: JSON.stringify({ properties: { "Status": { status: { name: body.status } } } })
      });
      if (!res.ok) return json(res.status, { error: "Notion update failed", detail: await res.text() });
      return json(200, { ok: true });
    }

    return json(405, { error: "method not allowed" });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
