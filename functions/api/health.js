// GET /api/health?key=접속비밀번호
// 설정이 제대로 됐는지, 게이트웨이가 실제로 답하는지 확인한다. 키 값은 절대 보여주지 않는다.
const json = (status, obj) =>
  new Response(JSON.stringify(obj, null, 2), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export async function onRequestGet({ request, env }) {
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
    const body = (await up.text()).slice(0, 600);
    let answer = null;
    try { answer = JSON.parse(body).choices?.[0]?.message?.content ?? null; } catch {}
    return json(up.ok && answer ? 200 : 502, {
      ok: up.ok && !!answer,
      ...report,
      게이트웨이_응답: { 상태코드: up.status, 걸린시간_ms: Date.now() - t0, 받은_답: answer, 원문_앞부분: body },
    });
  } catch (e) {
    return json(502, { ok: false, ...report, 문제: "게이트웨이 주소에 연결 자체가 안 됨: " + String(e).slice(0, 200) });
  }
}
