import { NextResponse } from "next/server";
import { readEnv } from "@flowfoundry/config";

export async function GET() {
  const env = readEnv();
  
  return NextResponse.json({
    google: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    github: !!(env.GITHUB_ID && env.GITHUB_SECRET),
    email: true // Email provider is always available
  });
}

