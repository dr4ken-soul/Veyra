export const runtime = "nodejs";

export function GET() {
  return Response.json({ status: "ok", service: "veyra" }, {
    headers: { "Cache-Control": "no-store" }
  });
}