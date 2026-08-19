#!/usr/bin/env node
/**
 * Load MEMORY-SEED.md into Ulo's Supabase memory.
 *
 * Format: `## section` headings become tags; `- ` bullets under them become
 * memories. Empty bullets, `_prompts:_` hint lines, and `>` notes are skipped.
 *
 * Idempotent: facts whose exact text is already stored are left alone, so you can
 * top up the file and re-run without creating duplicates.
 *
 * Usage:  npm run seed-memory          (add new facts)
 *         npm run seed-memory -- --dry (show what would be added, change nothing)
 */

import { readFileSync } from "node:fs";

const DRY_RUN = process.argv.includes("--dry");
const SEED_FILE = new URL("../MEMORY-SEED.md", import.meta.url);

function loadEnv() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    if (!line.includes("=") || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, "");
  }
  const url = env.SUPABASE_URL?.replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key === "replace-me") {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  return { url, key };
}

/** Section heading → a short tag: "school — oak grove" → "school-oak-grove". */
function toTag(heading) {
  return heading
    .toLowerCase()
    .replace(/[—–]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

function parseSeedFile() {
  const text = readFileSync(SEED_FILE, "utf8");
  const facts = [];
  let tag = null;
  let inPreamble = true;

  for (const line of text.split("\n")) {
    const heading = line.match(/^##\s+(.*\S)\s*$/);
    if (heading) {
      const title = heading[1];
      // Everything before the `---` divider is instructions, not content.
      if (inPreamble) { tag = null; continue; }
      tag = toTag(title);
      continue;
    }
    if (line.trim() === "---") { inPreamble = false; continue; }
    if (!tag) continue;

    const bullet = line.match(/^-\s+(.*\S)\s*$/);
    if (!bullet) continue;
    const content = bullet[1].trim();

    // Skip hint lines and anything that's still a placeholder.
    if (content.startsWith("_") || content.startsWith(">")) continue;
    if (content.length < 3) continue;

    facts.push({ content, tags: [tag] });
  }
  return facts;
}

async function main() {
  const { url, key } = loadEnv();
  const headers = {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
  };

  const facts = parseSeedFile();
  if (facts.length === 0) {
    console.log("No filled-in bullets found in MEMORY-SEED.md — nothing to do.");
    return;
  }

  const res = await fetch(`${url}/rest/v1/memories?select=content&deleted_at=is.null`, { headers });
  if (!res.ok) {
    console.error(`Could not read existing memories (${res.status}): ${await res.text()}`);
    process.exit(1);
  }
  const existing = new Set((await res.json()).map((r) => r.content.trim().toLowerCase()));

  const fresh = facts.filter((f) => !existing.has(f.content.toLowerCase()));
  const skipped = facts.length - fresh.length;

  console.log(`Parsed ${facts.length} fact(s) from MEMORY-SEED.md`);
  if (skipped) console.log(`  ${skipped} already saved — skipping`);

  if (fresh.length === 0) {
    console.log("Nothing new to add.");
    return;
  }

  for (const f of fresh) console.log(`  + [${f.tags[0]}] ${f.content}`);

  if (DRY_RUN) {
    console.log(`\nDry run — nothing written. Re-run without --dry to save ${fresh.length}.`);
    return;
  }

  const write = await fetch(`${url}/rest/v1/memories`, {
    method: "POST",
    headers: { ...headers, prefer: "return=representation" },
    body: JSON.stringify(fresh),
  });
  if (!write.ok) {
    console.error(`Write failed (${write.status}): ${await write.text()}`);
    process.exit(1);
  }
  console.log(`\nSaved ${(await write.json()).length} new memories.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
