import { NextRequest, NextResponse } from "next/server";
import { removeSubscriptionByEndpoint } from "@/lib/push-alerts";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { endpoint?: string };
  const endpoint = body.endpoint?.trim();

  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint requerido." }, { status: 400 });
  }

  await removeSubscriptionByEndpoint(endpoint);
  return NextResponse.json({ ok: true }, { status: 200 });
}
