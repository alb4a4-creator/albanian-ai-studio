const TEXT_MODEL = "wan-2.6";
const IMAGE_MODEL = "wan-2.6-i2v";
const API_BASE = "https://api.renderful.ai/api/v1";
const json = (res, status, body) => res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));

async function verifyUser(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  const token = (authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : authHeader).trim();
  if (!token) return { ok: false, reason: "Mungon token-i i hyrjes. Dil nga llogaria dhe hyr përsëri." };
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return { ok: false, reason: "Mungon konfigurimi i Supabase në Vercel." };
  const response = await fetch(url + "/auth/v1/user", { headers: { apikey: key, Authorization: "Bearer " + token } });
  if (response.ok) { const user = await response.json(); return { ok: true, userId: user.id }; }
  if (response.status === 401 || response.status === 403) return { ok: false, reason: "Sesioni ka skaduar. Dil nga llogaria dhe hyr përsëri." };
  return { ok: false, reason: "Supabase nuk mundi të verifikojë hyrjen (HTTP " + response.status + ")." };
}

function supabaseConfig() {
  return {
    url: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, ""),
    key: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  };
}

async function refundCredit(url, key, token) {
  await fetch(url + "/rest/v1/rpc/refund_video_credit", {
    method: "POST",
    headers: { apikey: key, Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ p_reference: "provider-rejected" })
  }).catch(() => {});
}

async function uploadImage(apiKey, dataUrl) {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("Fotografia nuk ka format të vlefshëm.");
  const mime = match[1] === "jpg" ? "image/jpeg" : "image/" + match[1];
  const bytes = Buffer.from(match[2], "base64");
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mime }), "reference." + (match[1] === "jpeg" ? "jpg" : match[1]));
  const response = await fetch(API_BASE + "/uploads", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey },
    body: form
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.url) throw new Error(data.error || "Renderful nuk mundi ta ngarkojë fotografinë.");
  return data.url;
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  try {
    const auth = await verifyUser(req);
    if (!auth.ok) return json(res, 401, { error: auth.reason });

    const apiKey = process.env.RENDERFUL_API_KEY;
    const billingEnabled = process.env.GENERATION_BILLING_ENABLED === "true";

    if (req.method === "GET" && req.query?.health === "1") {
      if (!apiKey || !billingEnabled) return json(res, 200, { provider: "Renderful · WAN 2.6", configured: false, billingEnabled });
      const balanceRes = await fetch(API_BASE + "/account/balance", { headers: { Authorization: "Bearer " + apiKey } });
      const balanceData = await balanceRes.json().catch(() => ({}));
      return json(res, 200, { provider: "Renderful · WAN 2.6", configured: balanceRes.ok, billingEnabled, providerStatus: balanceRes.ok ? "connected" : "authentication_failed" });
    }

    if (!apiKey) return json(res, 503, { error: "Motori Renderful nuk është konfiguruar. Kontrollo RENDERFUL_API_KEY në Vercel." });
    if (!billingEnabled) return json(res, 503, { error: "Gjenerimi mbetet i mbyllur derisa të aktivizohet sistemi i krediteve." });

    if (req.method === "POST") {
      const { prompt, mode, duration, ratio, imageData } = req.body || {};
      if (typeof prompt !== "string" || prompt.trim().length < 3 || prompt.length > 4000) return json(res, 400, { error: "Përshkrimi duhet të ketë 3–4000 karaktere." });
      if (!["text", "image"].includes(mode)) return json(res, 400, { error: "Modalitet i pavlefshëm." });
      if (mode === "image" && (typeof imageData !== "string" || !/^data:image\/(png|jpeg|webp);base64,/.test(imageData) || imageData.length > 5_000_000)) return json(res, 400, { error: "Ngarko një fotografi të vlefshme, deri në rreth 3.5 MB." });

      const seconds = Math.max(4, Math.min(15, Number(duration) || 5));
      const aspect = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].includes(ratio) ? ratio : "16:9";
      const model = mode === "image" ? IMAGE_MODEL : TEXT_MODEL;
      const { url, key } = supabaseConfig();
      const token = (req.headers.authorization || "").replace(/^Bearer /i, "");
      if (!url || !key) return json(res, 503, { error: "Mungon konfigurimi i Supabase." });

      const debit = await fetch(url + "/rest/v1/rpc/spend_video_credit", {
        method: "POST",
        headers: { apikey: key, Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ p_reference: "video:" + Date.now() })
      });
      const debitData = await debit.json().catch(() => null);
      const debitRow = Array.isArray(debitData) ? debitData[0] : debitData;
      if (!debit.ok || !debitRow?.success) return json(res, 402, { error: debitRow?.message || "Nuk ke kredite. Merr krediti falas javor ose zgjidh një paketë." });

      try {
        const input = { type: mode === "image" ? "image-to-video" : "text-to-video", model, prompt: prompt.trim(), duration: seconds, aspect_ratio: aspect };
        if (mode === "image") input.image_url = await uploadImage(apiKey, imageData);
        const response = await fetch(API_BASE + "/generations", {
          method: "POST",
          headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
          body: JSON.stringify(input)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.id) {
          await refundCredit(url, key, token);
          return json(res, response.status || 502, { error: data.error || data.message || "Renderful nuk e pranoi kërkesën. Krediti u kthye nëse rimbursimi u krye." });
        }
        return json(res, 202, { requestId: data.id, model, status: data.status || "queued" });
      } catch (error) {
        await refundCredit(url, key, token);
        return json(res, 502, { error: error.message || "Nuk u dërgua kërkesa te Renderful. Krediti u kthye nëse rimbursimi u krye." });
      }
    }

    const requestId = String(req.query?.requestId || "");
    const model = String(req.query?.model || "");
    if (!/^[A-Za-z0-9_-]{5,100}$/.test(requestId) || ![TEXT_MODEL, IMAGE_MODEL].includes(model)) return json(res, 400, { error: "Kërkesë e pavlefshme." });
    const response = await fetch(API_BASE + "/generations/" + encodeURIComponent(requestId), { headers: { Authorization: "Bearer " + apiKey } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return json(res, response.status, { error: data.error || "Nuk u lexua statusi i videos." });
    if (data.status === "completed") {
      const output = Array.isArray(data.outputs) ? data.outputs[0] : null;
      const videoUrl = typeof output === "string" ? output : output?.url;
      if (!videoUrl) return json(res, 502, { error: "Gjenerimi përfundoi, por Renderful nuk ktheu lidhjen e videos." });
      return json(res, 200, { status: "COMPLETED", videoUrl });
    }
    if (data.status === "failed") return json(res, 502, { status: "FAILED", error: data.error || "Gjenerimi i videos dështoi." });
    return json(res, 200, { status: String(data.status || "processing").toUpperCase() });
  } catch (err) {
    console.error("Renderful video generation API error", err);
    return json(res, 500, { error: "Gabim i brendshëm gjatë krijimit të videos." });
  }
}