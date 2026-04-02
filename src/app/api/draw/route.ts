import { NextRequest, NextResponse } from "next/server";
import { getDrawData } from "@/lib/draw";

export async function GET(request: NextRequest) {
  const drawUrl = request.nextUrl.searchParams.get("drawUrl")?.trim() ?? "";
  const playerName = request.nextUrl.searchParams.get("playerName")?.trim() ?? "";

  if (!drawUrl) {
    return NextResponse.json({ error: "Falta drawUrl" }, { status: 400 });
  }

  if (!playerName) {
    return NextResponse.json({ error: "Falta playerName" }, { status: 400 });
  }

  try {
    const data = await getDrawData(drawUrl, playerName);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado al cargar cuadro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
