import { readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function discover(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return discover(path);
    // Windows cloud-backed files can be reported as reparse points rather than regular Dirents.
    return /\.test\.(?:ts|tsx|mjs)$/.test(entry.name) && statSync(path).isFile() ? [relative(root, path)] : [];
  });
}

const tests = ["src", "scripts"].flatMap(directory => discover(join(root, directory))).sort();
if (!tests.length) throw new Error("No local unit tests were found.");
const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...tests], { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
