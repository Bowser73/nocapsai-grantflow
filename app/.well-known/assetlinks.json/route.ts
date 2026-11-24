import { NextResponse } from "next/server";
export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^([A-Fa-f0-9]{2}:){31}[A-Fa-f0-9]{2}$/.test(s));
  if (!fingerprints.length) return NextResponse.json([], { status: 503 });
  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.nocapsai.grantflow",
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
