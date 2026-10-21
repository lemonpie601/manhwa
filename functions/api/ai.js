// Cloudflare Pages Functions 진입점 (Pages로 만들었을 때)
import { handleAI } from "../../worker/handlers.js";
export const onRequestPost = ({ request, env }) => handleAI(request, env);
export const onRequestGet = () => new Response(JSON.stringify({ code: "method_not_allowed" }), { status: 405, headers: { "content-type": "application/json" } });
