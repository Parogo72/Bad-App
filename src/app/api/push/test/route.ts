import { NextRequest, NextResponse } from "next/server";
import { sendTestNotification } from "@/lib/push-alerts";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { query?: string };
  const query = body.query?.trim();

  if (!query) {
    return NextResponse.json({ error: "Query requerida." }, { status: 400 });
  }

  try {
    const sent = await sendTestNotification(query);
    return NextResponse.json({ ok: true, sent }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al enviar notificación de prueba.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
