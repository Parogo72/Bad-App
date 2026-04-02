import { NextRequest, NextResponse } from "next/server";
import { getPlayerDashboard } from "@/lib/badminton";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";

  if (!query) {
    return NextResponse.json(
      {
        error: "Debes enviar ?query= con el ID nacional o el ID de perfil.",
      },
      { status: 400 },
    );
  }

  try {
    const data = await getPlayerDashboard(query);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
