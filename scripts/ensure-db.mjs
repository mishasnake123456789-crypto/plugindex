#!/usr/bin/env node
/**
 * Ensure data/plugins.sqlite exists. If only the gzipped snapshot is present,
 * decompress it. Safe to run on every install/build.
 */
import { createReadStream, createWriteStream, existsSync, statSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = path.join(root, "data", "plugins.sqlite");
const gzPath = `${dbPath}.gz`;

function ok(file) {
  try {
    return existsSync(file) && statSync(file).size > 1024;
  } catch {
    return false;
  }
}

if (ok(dbPath)) {
  console.log(`SQLite index ready (${Math.round(statSync(dbPath).size / 1e6)}MB)`);
  process.exit(0);
}

if (!ok(gzPath)) {
  console.warn(
    "No local plugin index found. Run `pnpm sync` (or `pnpm sync:sample`) before expecting full SEO coverage.",
  );
  process.exit(0);
}

console.log("Decompressing data/plugins.sqlite.gz…");
await pipeline(createReadStream(gzPath), createGunzip(), createWriteStream(dbPath));
console.log(`SQLite index ready (${Math.round(statSync(dbPath).size / 1e6)}MB)`);
