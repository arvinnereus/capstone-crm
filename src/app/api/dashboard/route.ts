import { NextResponse } from "next/server";

import { getDashboardData } from "@/lib/dashboard";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = await getDb();
  const data = await getDashboardData(db);
  return NextResponse.json(data);
}
