const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const jsDir = path.join(rootDir, "js");

const collectJavaScriptFiles = (dirPath) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJavaScriptFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
};

const checkFile = (filePath) => {
  const source = fs.readFileSync(filePath, "utf8");

  const isModule = /\b(import|export)\b/.test(source);

  if (!isModule) {
    const result = spawnSync(process.execPath, ["--check", filePath], { encoding: "utf8" });
    return result.status === 0 ? null : new Error((result.stderr || result.stdout || "Syntax check failed").trim());
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aegis-js-check-"));
  const tempFile = path.join(tempDir, `${path.basename(filePath, ".js")}.mjs`);

  try {
    fs.writeFileSync(tempFile, source, "utf8");
    const result = spawnSync(process.execPath, ["--check", tempFile], { encoding: "utf8" });
    return result.status === 0 ? null : new Error((result.stderr || result.stdout || "Syntax check failed").trim());
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

const files = collectJavaScriptFiles(jsDir);
const failures = [];

for (const filePath of files) {
  const error = checkFile(filePath);
  if (error) {
    failures.push({
      filePath: path.relative(rootDir, filePath),
      message: error.message
    });
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`${failure.filePath}: ${failure.message}`);
  }
  process.exit(1);
}

console.log(`Checked ${files.length} JavaScript files.`);