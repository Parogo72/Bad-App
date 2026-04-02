import { NextRequest, NextResponse } from "next/server";
import { checkAndNotifyTournamentChanges } from "@/lib/push-alerts";

function isAuthorized(request: NextRequest) {
  const secret = process.env.ALERT_CHECK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const headerSecret = request.headers.get("x-alert-secret");
  const querySecret = request.nextUrl.searchParams.get("secret");
  return headerSecret === secret || querySecret === secret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { query?: string };
  const query = body.query?.trim();

  try {
    const result = await checkAndNotifyTournamentChanges(query || undefined);
    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al comprobar cambios.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
