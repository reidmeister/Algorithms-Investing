import { NextRequest } from "next/server";

const USERNAME = "reid";
const PASSWORD = "Maestro1171";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (username === USERNAME && password === PASSWORD) {
    const response = Response.json({ ok: true });
    (response.headers as any).set(
      "Set-Cookie",
      `auth=1; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
    );
    return response;
  }

  return Response.json({ ok: false }, { status: 401 });
}

export async function DELETE() {
  const response = Response.json({ ok: true });
  (response.headers as any).set(
    "Set-Cookie",
    `auth=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
  );
  return response;
}
