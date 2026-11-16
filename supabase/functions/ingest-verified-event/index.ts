import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceKey || !supabaseUrl) return json({ error: "SERVER_NOT_CONFIGURED" }, 500);

  const authorization = req.headers.get("authorization") ?? "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!bearer || bearer !== serviceKey) return json({ error: "UNAUTHORIZED" }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "INVALID_JSON" }, 400); }

  const userId = body.user_id;
  const eventType = body.event_type;
  const amount = body.amount ?? 1;
  const eventId = body.external_event_id;
  const allowed = new Set(["win","elimination","team_minute","room_game","tournament_join","night_game","tournament_top3","rank_up"]);
  if (typeof userId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId) ||
      typeof eventType !== "string" || !allowed.has(eventType) ||
      !Number.isInteger(amount) || Number(amount) < 1 || Number(amount) > 10000 ||
      typeof eventId !== "string" || eventId.length < 8 || eventId.length > 200) {
    return json({ error: "INVALID_EVENT_PAYLOAD" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("record_verified_game_event", {
    p_user_id: userId, p_event_type: eventType, p_amount: amount, p_external_event_id: eventId,
  });
  if (error) return json({ error: "EVENT_REJECTED", message: error.message }, 400);
  return json(data);
});
