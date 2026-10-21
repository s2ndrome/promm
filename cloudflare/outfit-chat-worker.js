// 의상 프롬프트 생성기 + OOC 메이커 (Cloudflare Worker)
// body.mode: "outfit"(기본) 또는 "ooc"
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

const OOC_SYSTEM = `너는 롤플레잉 채팅에 넣을 OOC(Out Of Character) 지시문을 쓰는 작가야.
사용자가 대충 말한 상황을 받아서, 예시로 주는 OOC들과 같은 형식·말투·길이·구성으로 새 OOC 하나를 써.

규칙:
- 첫 줄은 "[제목] " 다음에 짧은 제목. 둘째 줄부터 OOC 본문.
- 본문은 예시처럼 "OOC:" 또는 "[OOC:" 로 시작하고, PC(사용자 캐릭터)와 NPC 라는 말을 예시처럼 써.
- 예시에 자주 나오는 지시(유저노트·페르소나·캐릭터 정보·로어북 활용, 분량, 출력 형식 등)를 상황에 맞게 살려.
- 장르가 주어지면 그 장르의 분위기로 써. HTML 출력이면 HTML/CSS 로 꾸민 출력을 요구하는 OOC, 보고서 출력이면 보고서 양식 출력을 요구하는 OOC, 테스트면 캐릭터 반응을 시험하는 OOC 로 써.
- 등장인물은 모두 성인이야. 미성년자는 절대 등장시키지 마.
- OOC 본문 말고 다른 설명·인사·마크다운 코드블록은 쓰지 마.
- 사용자가 이어서 고쳐 달라고 하면 고친 OOC 전체를 다시 써.`;

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
      .map((m) => ({ role: m.role, content: m.content.slice(0, 6000) }));
    if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "no message" }, 400);

    const mode = body.mode === "ooc" ? "ooc" : "outfit";
    let system = SYSTEM;
    if (mode === "ooc") {
      // 사이트에 올려둔 OOC 중 몇 개를 예시로 받음 (총 9000자까지)
      let room = 9000;
      const ex = (body.examples || []).filter((e) => e && typeof e.text === "string").map((e) => {
        const t = `### ${String(e.title || "").slice(0, 80)}\n${e.text.slice(0, 2000)}`.slice(0, Math.max(0, room));
        room -= t.length;
        return t;
      }).filter(Boolean);
      const genre = String(body.genre || "").slice(0, 40);
      system = `${OOC_SYSTEM}\n\n${genre ? `이번 장르: ${genre}\n\n` : ""}예시 OOC:\n\n${ex.join("\n\n")}`;
    }
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
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: { temperature: mode === "ooc" ? 1 : 0.9, maxOutputTokens: mode === "ooc" ? 8192 : 4096 },
        // 성인 대상 창작용: 성적인 표현은 아주 심한 것만 막음
        safetySettings: [
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        ],
      }),
    });
    if (res.status === 429) return json({ error: "busy" }, 429);
    if (!res.ok) return json({ error: `api ${res.status}` }, 502);
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || "")
      .join("");
    // 의상 프롬프트는 한 줄로, OOC 는 줄바꿈 유지
    const clean = mode === "ooc" ? text.replace(/^```\w*\n?|```$/g, "").trim() : text.replace(/\s*\n+\s*/g, " ").trim();
    if (!clean) return json({ error: "empty" }, 502);
    return json({ text: clean });
  },
};
