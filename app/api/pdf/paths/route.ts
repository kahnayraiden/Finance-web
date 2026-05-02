import { NextResponse } from "next/server";
import path from "path";
import { existsSync } from "fs";

export async function GET() {
  const cwd = process.cwd();
  const dirname = __dirname;
  
  const possiblePaths = [
    path.resolve(cwd, "lib", "ocr-worker.mjs"),
    path.resolve(dirname, "..", "..", "lib", "ocr-worker.mjs"),
    path.resolve(dirname, "ocr-worker.mjs"),
  ];
  
  const results = possiblePaths.map(p => ({ path: p, exists: existsSync(p) }));
  
  return NextResponse.json({
    cwd,
    dirname,
    paths: results,
  });
}
