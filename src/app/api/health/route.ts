import { NextResponse } from "next/server";
import { DATASET_VERSION } from "@/lib/datasets/version";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    datasetVersion: DATASET_VERSION,
    timestamp: new Date().toISOString(),
  });
}
