import {
  createReadStream,
  statSync,
  readdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "fs";
import { join, relative, dirname } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import ProgressBar from "progress";
import { createHash } from "crypto";
import dotenv from "dotenv";

dotenv.config();

// Resolve assets directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, "..", "assets");
const versionDir = join(root, ".v");
const hashDir = join(root, ".hash");
const ignoreFile = join(root, ".ignore");
const fileIgnoreFile = join(root, ".fignore");

if (!existsSync(root)) {
  console.error(chalk.red(`✖ Directory does not exist: ${root}`));
  process.exit(1);
}

// Create version directory if it doesn't exist
if (!existsSync(versionDir)) {
  mkdirSync(versionDir, { recursive: true });
}

// Create hash directory if it doesn't exist
if (!existsSync(hashDir)) {
  mkdirSync(hashDir, { recursive: true });
}

// Read .ignore file
let ignorePatterns = [];
if (existsSync(ignoreFile)) {
  ignorePatterns = readFileSync(ignoreFile, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) =>
      join("assets", line.replace(/^\/+/, "")).replace(/\\/g, "/")
    );
}

// Read .fignore file
let fileIgnorePatterns = [];
if (existsSync(fileIgnoreFile)) {
  fileIgnorePatterns = readFileSync(fileIgnoreFile, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.endsWith(".sha256"))
    .map((line) =>
      join("assets", line.replace(/^\/+/, "")).replace(/\\/g, "/")
    );
}

/* --- Calculate SHA-256 hash for a file --- */
function calculateFileHash(filePath) {
  let fileBuffer = readFileSync(filePath);
  // CRLF (\r\n) ni LF (\n) ga o'girish (normalize qilish)
  fileBuffer = Buffer.from(fileBuffer.toString("utf8").replace(/\r\n/g, "\n"));
  return createHash("sha256").update(fileBuffer).digest("hex");
}

/* --- Get or create hash file --- */
function getOrCreateHashFile(filePath) {
  const hashFilePath = join(hashDir, filePath.replace(/^assets\//, "")) + ".sha256";
  return { hashFilePath };
}

/* --- Get or create mtime file --- */
function getOrCreateMtimeFile(filePath) {
  const mtimeFilePath = join(versionDir, filePath.replace(/^assets\//, ""));
  let mtime = "0";

  if (existsSync(mtimeFilePath)) {
    mtime = readFileSync(mtimeFilePath, "utf8").trim();
  } else {
    mkdirSync(dirname(mtimeFilePath), { recursive: true });
    writeFileSync(mtimeFilePath, "0", "utf8");
  }

  return { mtimeFilePath, mtime };
}

/* --- Check if file is in ignored folder --- */
function isIgnoredForVersioning(file) {
  return ignorePatterns.some((pattern) => file.startsWith(pattern));
}

function isFileIgnoredCompletely(file) {
  return fileIgnorePatterns.some((pattern) => file.startsWith(pattern));
}

/* --- Update local hash file --- */
function updateLocalHashFile(file) {
  if (isFileIgnoredCompletely(file)) {
    console.log(chalk.gray(`⏩ Skipped hash (in .fignore): ${file}`));
    return false;
  }

  const fullPath = join(root, file.replace(/^assets\//, ""));
  const { hashFilePath } = getOrCreateHashFile(file);

  try {
    const hash = calculateFileHash(fullPath);
    mkdirSync(dirname(hashFilePath), { recursive: true });
    writeFileSync(hashFilePath, hash, "utf8");
    console.log(chalk.magenta(`🔑 Updated local hash file ${hashFilePath}`));
    return true;
  } catch (err) {
    console.error(chalk.red(`✖ Failed to update hash for ${file}: ${err.message}`));
    return false;
  }
}

/* --- Update local mtime file --- */
function updateLocalMtimeFile(file, newMtime) {
  if (isFileIgnoredCompletely(file)) {
    console.log(chalk.gray(`⏩ Skipped mtime (in .fignore): ${file}`));
    return true;
  }

  const { mtimeFilePath } = getOrCreateMtimeFile(file);
  try {
    mkdirSync(dirname(mtimeFilePath), { recursive: true });
    writeFileSync(mtimeFilePath, newMtime, "utf8");
    console.log(
      chalk.cyan(`📝 Updated local mtime file ${mtimeFilePath} to ${newMtime}`)
    );
    return true;
  } catch (err) {
    console.error(
      chalk.red(
        `✖ Failed to update local mtime file ${mtimeFilePath}: ${err.message}`
      )
    );
    return false;
  }
}

/* --- Recursively walk local dir with progress bar --- */
function walk(dir) {
  const files = [];
  const dirEntries = readdirSync(dir, { withFileTypes: true });

  // totalFiles hisoblash
  const totalFiles = dirEntries.reduce((count, entry) => {
    if (entry.isDirectory()) {
      return (
        count + readdirSync(join(dir, entry.name), { recursive: true }).length
      );
    }
    return count + 1;
  }, 0);

  const bar = new ProgressBar(
    chalk.blue(
      "Scanning files [:bar] :percent :current/:total (:etas remaining)"
    ),
    {
      total: totalFiles,
      width: 40,
      complete: "=",
      incomplete: " ",
    }
  );

  function walkRecursive(currentDir) {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (
        entry.isFile() &&
        !entry.name.startsWith(".") &&
        !fullPath.includes(versionDir) &&
        !fullPath.includes(hashDir)
      ) {
        const fileKey = join("assets", relative(root, fullPath)).replace(
          /\\/g,
          "/"
        );
        if (!isFileIgnoredCompletely(fileKey)) {
          files.push(fileKey);
        }
        bar.tick();
      } else if (entry.isDirectory()) {
        walkRecursive(fullPath);
      }
    }
  }

  walkRecursive(dir);
  return files;
}

/* --- Format file list as a table --- */
function printFileTable(files, title) {
  if (files.length === 0) {
    console.log(chalk.gray(`No ${title.toLowerCase()}`));
    return;
  }

  console.log(chalk.blue.bold(`\n${title}:`));
  console.log(chalk.blue("-".repeat(50)));
  console.log(
    chalk.white.bold(`| ${"File".padEnd(35)} | ${"Size (KB)".padEnd(10)} |`)
  );
  console.log(chalk.blue("-".repeat(50)));
  files.forEach((file) => {
    const fullPath = join(root, file.replace(/^assets\//, ""));
    let size = "N/A";
    try {
      const stats = statSync(fullPath);
      size = (stats.size / 1024).toFixed(2);
    } catch (e) {
      // File may not exist locally
    }
    console.log(`| ${file.padEnd(35)} | ${size.padEnd(10)} |`);
  });
  console.log(chalk.blue("-".repeat(50)));
}

/* --- Main prepare logic --- */
(async () => {
  console.log(chalk.blue.bold("🚀 Starting local file preparation..."));

  // Walk files with progress bar
  console.log(chalk.blue("🔍 Scanning local files..."));
  const localFiles = walk(root);
  console.log(chalk.blue(`🔍 Found ${localFiles.length} local files`));
  printFileTable(localFiles, "Local Files");

  // Process each file sequentially
  const prepareBar = new ProgressBar(
    chalk.blue(
      "Preparing files [:bar] :percent :current/:total (:etas remaining)"
    ),
    {
      total: localFiles.length,
      width: 40,
      complete: "=",
      incomplete: " ",
    }
  );

  for (const file of localFiles) {
    const fullPath = join(root, file.replace(/^assets\//, ""));

    if (!existsSync(fullPath)) {
      console.warn(chalk.yellow(`⚠ Skipping non-existent file: ${fullPath}`));
      prepareBar.tick();
      continue;
    }

    const localStats = statSync(fullPath);
    const newMtime = localStats.mtimeMs.toString();

    console.log(chalk.yellow(`\n📦 Preparing ${file}`));

    // Step 1: Update local mtime file
    const mtimeUpdated = updateLocalMtimeFile(file, newMtime);
    if (!mtimeUpdated) {
      prepareBar.tick();
      continue;
    }

    // Step 2: Update local hash file
    const hashUpdated = updateLocalHashFile(file);
    if (!hashUpdated) {
      prepareBar.tick();
      continue;
    }

    prepareBar.tick();
  }

  console.log(chalk.green.bold("✔ Local file preparation completed successfully!"));
})();
