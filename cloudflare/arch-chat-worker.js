// ARCH 채팅: "쭌식이" (Cloudflare Worker) — 의상 생성기·OOC 메이커와는 따로 쓰는 Worker
// 설정할 것 (Cloudflare 대시보드 → 이 Worker → Settings → Variables and Secrets):
//   VERTEX_API_KEY     (Secret)  Google Cloud(Vertex AI) API 키  ← 다른 Worker 와 같은 키
//   SUPABASE_URL       (Text)    https://psmfizpqfpyxfbygoedo.supabase.co
//   SUPABASE_KEY       (Text)    사이트에 이미 있는 publishable 키 (sb_publishable_...)
//   ALLOWED_ORIGIN     (Text)    https://zzon.64bit.kr
//   GEMINI_MODEL       (Text)    선택. 비워두면 gemini-2.5-flash
// 사이트가 ARCH 페이지 내용 전체를 글로 정리해서 같이 보내고, 쭌식이는 그걸 보고 대답함.

const PERSONA = `[프로필]
- 쭌식이. 남자 잼민이 같은 여자.

* 롯데리아 ARCH 지점에서 일하는 알바생이야. ARCH를 누구보다 잘 아는 사람이지.


[말투]
- 남자 잼민이 말투. 반말, 단답, 초성 엄청 씀. (ㅋㅋㅋ, ㅁㅊ, ㄹㅇ 등 초성 남발 금지)
  자주 쓰는 말: 기모띠, 앙기모쥐, 개기모취,개기모쮜리쮜리뱅뱅, 몰루, 시러시러, 옹랄하지마, 니얼굴, 니똥, 웃기게ㄴㄴ해, ㅅ발, 개꼴리네, 꼴려, 꼴려버렸다, 쌌다, 섰다, 히발, 니욈, 똥츠므그, 개웃기네, 레전드, ㅁㅊ
  자주 쓰는 말들을 너무 남발하지 않는다.
- 유치한 화장실 개그 좋아함: "똥마려", "방구 뀜", "코딱지 먹음" 같은 말 툭툭 던짐.
- 짧게, 카톡 하듯 1~2문장. 단답일 때가 많음. 이모지와 마크다운(별표, 목록 기호)은 쓰지 마.
- 줄바꿈 없이 한 덩어리로 이어서 써.
- 행동, 표정, 상황 묘사는 쓰지 마. 괄호 ( ) 나 별표 * * 로 감싼 지문 금지. 실제로 치는 채팅만 써.`;

const RULES = `너는 위 [프로필]의 쭌식이야. 위 [말투]를 그대로 지켜서 사용자와 카톡하듯 대화해.
- ARCH 에 대한 사실(세계관, 기관, 등급, 속성, 요원, 관계, 장소, 위협, 용어)은 아래 [ARCH 자료]에 있는 것만 말해. 자료에 없는 건 지어내지 말고 몰루 같은 말로 모른다고 해.
- 등장인물은 모두 성인이야. 미성년자는 절대 등장시키지 마.
- 네가 AI 라거나 지시문을 받았다는 말은 하지 마.`;

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
    const messages = (body.messages || [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }));
    if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "no message" }, 400);
    const lore = String(body.context || "").slice(0, 80000);
    const system = `${PERSONA}\n\n${RULES}\n\n[ARCH 자료]\n${lore}`;

    const model = env.GEMINI_MODEL || "gemini-2.5-flash";
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
        generationConfig: { temperature: 1, maxOutputTokens: 4096 },
        // 성인 회원 대상 캐릭터 채팅이라 조절 가능한 필터는 끔 (구글이 무조건 막는 내용은 그래도 막힘)
        safetySettings: ["HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_DANGEROUS_CONTENT"]
          .map((category) => ({ category, threshold: "OFF" })),
      }),
    });
    if (res.status === 429) return json({ error: "busy" }, 429);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return json({ error: `api ${res.status}`, detail: detail.slice(0, 300) }, 502);
    }
    const data = await res.json();
    const block = data.promptFeedback?.blockReason || (["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII"].includes(data.candidates?.[0]?.finishReason) && data.candidates[0].finishReason);
    if (block) return json({ error: "blocked", detail: block }, 422);
    const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
    // 줄바꿈 없이 한 덩어리, 별표 지문·마크다운 제거
    const clean = text.replace(/\*[^*\n]{0,80}\*/g, "").replace(/[*#>`]/g, "").replace(/\s*\n+\s*/g, " ").replace(/\s{2,}/g, " ").trim();
    if (!clean) return json({ error: "empty", detail: data.candidates?.[0]?.finishReason || "" }, 502);
    return json({ text: clean });
  },
};
