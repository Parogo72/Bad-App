import { NextResponse } from "next/server";
import { getPublicVapidKey } from "@/lib/push-alerts";

export async function GET() {
  const publicKey = await getPublicVapidKey();
  if (!publicKey) {
    return NextResponse.json(
      { error: "No se pudo preparar la clave pública VAPID." },
      { status: 500 },
    );
  }

  return NextResponse.json({ publicKey }, { status: 200 });
}
