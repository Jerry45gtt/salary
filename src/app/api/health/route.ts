export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { client } = await import("@/lib/db");
    const result = await client.execute("SELECT COUNT(*) AS total FROM sqlite_master WHERE type='table' AND name IN ('user','session','account','verification','profiles','categories','transactions','currency_locks','rate_limit')");
    if (Number(result.rows[0]?.total) !== 9) throw new Error("Required schema missing");
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Health check failed");
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
