import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

const BUCKET = "documentos";

/**
 * GET /api/lexbase/file?path=lexbase/tenant/uuid.pdf
 * Proxies a Lexbase file from Supabase Storage so it can be displayed
 * inline in an iframe (bypasses X-Frame-Options / CSP from Supabase).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    const storagePath = req.nextUrl.searchParams.get("path");
    if (!storagePath) {
      return new NextResponse("Missing path", { status: 400 });
    }

    const forceDownload = req.nextUrl.searchParams.get("download") === "1";

    // Security: only allow paths that belong to the current tenant
    if (!storagePath.startsWith(`lexbase/${session.tenant_id}/`)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const client = createAdminClient();

    // Download the file via admin client (bypasses RLS)
    const { data, error } = await client.storage
      .from(BUCKET)
      .download(storagePath);

    if (error || !data) {
      return new NextResponse(`Storage error: ${error?.message ?? "not found"}`, {
        status: 404,
      });
    }

    const buffer = await data.arrayBuffer();
    const contentType = data.type || "application/octet-stream";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // inline: display in browser; attachment: force download
        "Content-Disposition": forceDownload
          ? `attachment; filename="${storagePath.split("/").pop()}"`
          : "inline",
        // Allow iframe embedding from same origin
        "X-Frame-Options": "SAMEORIGIN",
        // Cache 30 min
        "Cache-Control": "private, max-age=1800",
      },
    });
  } catch (err) {
    console.error("[lexbase/file]", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
