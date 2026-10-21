// Cloudflare Pages Function: POST /api/ai
// 브라우저는 키를 모르고, 이 함수만 시크릿에서 키를 꺼내 AI 게이트웨이를 부른다.
//
// 필요한 시크릿/변수 (Cloudflare 대시보드 → 프로젝트 → Settings → Variables and Secrets)
//   AI_API_KEY      (시크릿, 필수) linkapi.ai에서 발급한 키
//   AI_MODEL        (필수) 게이트웨이에서 쓰는 모델 이름 그대로
//   ACCESS_PASSWORD (시크릿, 강력 추천) 친구들한테만 알려줄 접속 비밀번호
//   AI_BASE_URL     (선택) 기본 https://linkapi.ai/v1
//   AI_PATH         (선택) 기본 /chat/completions
//   AI_MAX_TOKENS   (선택) 기본 4096

const MAX_BODY = 400_000;   // 요청 크기 상한(바이트)
const MAX_TURNS = 24;

const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

function sameSecret(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function handleAI(request, env) {
  if (!env.AI_API_KEY || !env.AI_MODEL) return json(500, { code: "not_configured" });

  if (env.ACCESS_PASSWORD && !sameSecret(request.headers.get("x-access-key") || "", env.ACCESS_PASSWORD)) {
    return json(401, { code: "bad_password" });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json(413, { code: "prompt_too_large" });

  let body;
  try { body = JSON.parse(raw); } catch { return json(400, { code: "invalid_request" }); }

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map(m => ({ role: m.role, content: m.content }));
  if (!messages.length) return json(400, { code: "invalid_request" });
  // 첫 user 턴(수업 자료 규칙)은 남기고 오래된 대화만 자른다
  const trimmed = messages.length > MAX_TURNS ? [messages[0], ...messages.slice(-(MAX_TURNS - 1))] : messages;

  const base = (env.AI_BASE_URL || "https://linkapi.ai/v1").replace(/\/+$/, "");
  const path = env.AI_PATH || "/chat/completions";

  let up;
  try {
    up = await fetch(base + path, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + env.AI_API_KEY },
      body: JSON.stringify({
        model: env.AI_MODEL,
        messages: [
          { role: "system", content: "너는 대학 1학년 '만화 상징과 시각 서사의 역사' 수업 조교다. 사용자가 준 수업 자료만 근거로 한국어로 답한다." },
          ...trimmed,
        ],
        stream: true,
        max_tokens: Number(env.AI_MAX_TOKENS || 4096),
      }),
    });
  } catch (e) {
    return json(502, { code: "upstream_error", detail: "게이트웨이에 연결하지 못함" });
  }

  if (!up.ok) {
    const detail = (await up.text()).slice(0, 300);
    const code = up.status === 429 ? "rate_limited" : up.status === 401 || up.status === 403 ? "not_configured" : "upstream_error";
    return json(up.status === 429 ? 429 : 502, { code, detail });
  }

  return new Response(up.body, {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store" },
  });
}


export async function handleHealth(request, env) {
  const key = new URL(request.url).searchParams.get("key") || "";
  if (env.ACCESS_PASSWORD && key !== env.ACCESS_PASSWORD) return json(401, { ok: false, 문제: "주소 끝에 ?key=접속비밀번호 를 붙여서 여세요" });

  const base = (env.AI_BASE_URL || "https://linkapi.ai/v1").replace(/\/+$/, "");
  const path = env.AI_PATH || "/chat/completions";
  const report = {
    설정: {
      AI_API_KEY: env.AI_API_KEY ? `있음 (${env.AI_API_KEY.length}자)` : "없음",
      AI_MODEL: env.AI_MODEL || "없음",
      ACCESS_PASSWORD: env.ACCESS_PASSWORD ? "있음" : "없음 (누구나 AI 사용 가능!)",
      호출_주소: base + path,
    },
  };
  if (!env.AI_API_KEY || !env.AI_MODEL) return json(500, { ok: false, ...report, 문제: "AI_API_KEY 또는 AI_MODEL이 비어 있어요. 넣은 뒤 다시 배포하세요." });

  try {
    const t0 = Date.now();
    const up = await fetch(base + path, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + env.AI_API_KEY },
      body: JSON.stringify({ model: env.AI_MODEL, messages: [{ role: "user", content: "OK라고만 답해" }], max_tokens: 20 }),
    });
    const full = await up.text();
    const body = full.slice(0, 600);
    let answer = null;
    try { answer = JSON.parse(full).choices?.[0]?.message?.content ?? null; } catch {}
    return json(up.ok && answer ? 200 : 502, {
      ok: up.ok && !!answer,
      ...report,
      게이트웨이_응답: { 상태코드: up.status, 걸린시간_ms: Date.now() - t0, 받은_답: answer, 원문_앞부분: body },
    });
  } catch (e) {
    return json(502, { ok: false, ...report, 문제: "게이트웨이 주소에 연결 자체가 안 됨: " + String(e).slice(0, 200) });
  }
}
