import { handleHealth } from "../../worker/handlers.js";
export const onRequestGet = ({ request, env }) => handleHealth(request, env);
