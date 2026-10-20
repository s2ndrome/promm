// 의상 프롬프트 생성기 (Cloudflare Worker)
// 설정할 것 (Cloudflare 대시보드 → 이 Worker → Settings → Variables and Secrets):
//   VERTEX_API_KEY     (Secret)  Google Cloud(Vertex AI) API 키  ← 둘 중 하나만 있으면 됨
//   GEMINI_API_KEY     (Secret)  Google AI Studio API 키
//   GEMINI_MODEL       (Text)    선택. 비워두면 gemini-2.5-flash
//   SUPABASE_URL       (Text)    https://psmfizpqfpyxfbygoedo.supabase.co
//   SUPABASE_KEY       (Text)    사이트에 이미 있는 publishable 키 (sb_publishable_...)
//   ALLOWED_ORIGIN     (Text)    https://zzon.64bit.kr
// 회원만 쓸 수 있도록, 사이트가 보내는 로그인 토큰으로 Supabase 에 등급을 물어봄.
// Google Gemini API 를 fetch 로 부름.

const SYSTEM = `You write outfit prompts for an anime image generator. Reply with the outfit prompt only.

Format:
- One line of comma-separated English tags in lowercase, ending with a comma.
- Clothing, accessories, legwear and shoes only. No hair, eyes, body, pose, background, character names or quality tags.
- Weighting syntax may be used: "2::tag, tag::" to strengthen, "1::tag::" for normal, "-1::tag::" to weaken.
- Order from head to toe: style words, headwear, tops (layers), bottoms, legwear, shoes.

Example reply:
y2k, kawaii, 1::gray beret, newsboy cap::, 2::layered clothing, white oversized zip-up hoodie, star print white turtleneck::, frilled hem, check pattern gray pleated mini skirt, bare legs, grey leg warmers, black shoes,

Never add explanations, greetings, Korean text, quotes, markdown or line breaks. If the request is vague, still return one complete outfit. If the user asks to change part of the previous outfit, return the whole updated outfit.`;

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGIN || "https://zzon.64bit.kr").split(",").map((s) => s.trim());
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      Vary: "Origin",
    };
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return json({ error: "POST only" }, 405);
    if (!allowed.includes(origin)) return json({ error: "origin" }, 403);

    // 회원 확인: 로그인 토큰으로 my_rank() 호출 (회원이면 1 이상)
    const auth = req.headers.get("Authorization") || "";
    const rankRes = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/my_rank`, {
      method: "POST",
      headers: { apikey: env.SUPABASE_KEY, Authorization: auth, "Content-Type": "application/json" },
      body: "{}",
    });
    const rank = rankRes.ok ? await rankRes.json() : 0;
    if (!(rank >= 1)) return json({ error: "members only" }, 403);

    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: "bad request" }, 400);
    }
    // 최근 대화 12개까지, 글자 수 제한
    const messages = (body.messages || [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
    if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "no message" }, 400);

    const model = env.GEMINI_MODEL || "gemini-2.5-flash";
    // Vertex 키가 있으면 Vertex AI, 없으면 AI Studio(Gemini API) 주소로 부름
    const key = env.VERTEX_API_KEY || env.GEMINI_API_KEY;
    const url = env.VERTEX_API_KEY
      ? `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent`
      : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: { temperature: 0.9, maxOutputTokens: 1024 },
      }),
    });
    if (res.status === 429) return json({ error: "busy" }, 429);
    if (!res.ok) return json({ error: `api ${res.status}` }, 502);
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || "")
      .join("")
      .replace(/\s*\n+\s*/g, " ")
      .trim();
    if (!text) return json({ error: "empty" }, 502);
    return json({ text });
  },
};
