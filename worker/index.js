// Cloudflare Workers 진입점: /api/* 는 여기서, 나머지는 public 폴더의 정적 파일
import { handleAI, handleHealth } from "./handlers.js";

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/ai") {
      if (request.method !== "POST") return new Response(JSON.stringify({ code: "method_not_allowed" }), { status: 405, headers: { "content-type": "application/json" } });
      return handleAI(request, env);
    }
    if (pathname === "/api/health") return handleHealth(request, env);
    return env.ASSETS.fetch(request);
  },
};
