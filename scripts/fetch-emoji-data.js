import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_URL = "https://unicode.org/Public/emoji/latest/emoji-test.txt";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "src", "data");
const outFile = join(outDir, "emoji.json");

function toTokens(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function unique(list) {
  return Array.from(new Set(list));
}

function parseEmojiTest(text) {
  let group = "";
  let subgroup = "";
  const emojis = [];

  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) {
      if (line.startsWith("# group:")) {
        group = line.replace("# group:", "").trim();
      }
      if (line.startsWith("# subgroup:")) {
        subgroup = line.replace("# subgroup:", "").trim();
      }
      continue;
    }

    const parts = line.split("#");
    if (parts.length < 2) continue;

    const left = parts[0].trim();
    const right = parts[1].trim();
    const status = left.split(";")[1]?.trim().split(/\s+/)[0];

    if (status !== "fully-qualified") continue;

    const rightParts = right.split(/\s+/);
    const emoji = rightParts[0];
    const versionToken = rightParts[1] || "";
    const name = rightParts.slice(2).join(" ");

    const keywords = unique([
      ...toTokens(name),
      ...toTokens(group),
      ...toTokens(subgroup),
    ]);

    emojis.push({
      emoji,
      name,
      group,
      subgroup,
      keywords,
      version: versionToken.replace(/^E/, ""),
    });
  }

  return emojis;
}

async function run() {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch emoji-test.txt: ${response.status}`);
  }

  const text = await response.text();
  const emojis = parseEmojiTest(text);

  await mkdir(outDir, { recursive: true });
  await writeFile(
    outFile,
    JSON.stringify(
      {
        source: SOURCE_URL,
        generatedAt: new Date().toISOString(),
        count: emojis.length,
        emojis,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`Wrote ${emojis.length} emojis to ${outFile}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
