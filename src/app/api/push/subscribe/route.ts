import { NextRequest, NextResponse } from "next/server";
import { addSubscription } from "@/lib/push-alerts";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    query?: string;
    subscription?: {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
  };

  const query = body.query?.trim();
  const subscription = body.subscription;

  if (!query || !subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return NextResponse.json({ error: "Payload de suscripción inválido." }, { status: 400 });
  }

  await addSubscription({
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    query,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
