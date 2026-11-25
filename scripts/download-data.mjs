// Downloads the open dictionary datasets into data/raw and extracts them to data/raw/extracted.
// Sources & licenses: see README ("Ghi nguồn dữ liệu").
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const RAW = path.resolve(import.meta.dirname, "../data/raw");
const OUT = path.join(RAW, "extracted");
fs.mkdirSync(OUT, { recursive: true });

async function latestAssets(repo) {
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
  if (!res.ok) throw new Error(`${repo}: HTTP ${res.status}`);
  return (await res.json()).assets;
}

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  fs.writeFileSync(path.join(RAW, file), Buffer.from(await res.arrayBuffer()));
  console.log(`✓ ${file}`);
}

const jm = await latestAssets("scriptin/jmdict-simplified");
for (const prefix of ["jmdict-examples-eng-", "kanjidic2-en-", "kradfile-", "radkfile-"]) {
  const a = jm.find((x) => x.name.startsWith(prefix) && x.name.endsWith(".json.zip"));
  await download(a.browser_download_url, `${prefix.slice(0, -1)}.json.zip`);
}

const kvg = await latestAssets("KanjiVG/kanjivg");
const xml = kvg.find((x) => /^kanjivg-\d+\.xml\.gz$/.test(x.name));
await download(xml.browser_download_url, "kanjivg.xml.gz");

await download("https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip", "Unihan.zip");
await download("https://www.unicode.org/Public/UCD/latest/ucd/CJKRadicals.txt", "CJKRadicals.txt");

// tar (bsdtar) extracts zip on Windows 10+, macOS and most Linux distros.
for (const f of fs.readdirSync(RAW).filter((f) => f.endsWith(".zip"))) {
  execFileSync("tar", ["-xf", path.join(RAW, f), "-C", OUT]);
}
fs.writeFileSync(path.join(RAW, "kanjivg.xml"), zlib.gunzipSync(fs.readFileSync(path.join(RAW, "kanjivg.xml.gz"))));
console.log("Extracted to data/raw/extracted");
