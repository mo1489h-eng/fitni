/**
 * Quick connection check: loads .env and fetches one row from a table.
 * Edit TABLE below (or set env TEST_SUPABASE_TABLE) to match your table name.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {string} Change this to your table name, e.g. "clients", "body_scans", "profiles" */
const TABLE = process.env.TEST_SUPABASE_TABLE ?? "profiles";

function loadDotEnv() {
  const path = join(__dirname, ".env");
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadDotEnv();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env"
  );
  process.exit(1);
}

const supabase = createClient(url, key);

const { data, error } = await supabase.from(TABLE).select("*").limit(1).maybeSingle();

if (error) {
  console.error("Supabase error:", error.message);
  process.exit(1);
}

if (data === null) {
  console.log(`Connection OK. Table "${TABLE}" exists but has no rows (or RLS blocked read).`);
} else {
  console.log(`Connection OK. One row from "${TABLE}":`);
  console.log(data);
}
