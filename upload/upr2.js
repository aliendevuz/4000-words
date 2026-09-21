import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import {
  statSync,
  readdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  createReadStream,
} from "fs";
import { join, relative, dirname } from "path";
import { fileURLToPath } from "url";
import mime from "mime";
import chalk from "chalk";
import ProgressBar from "progress";
import { createHash } from "crypto";
import pLimit from "p-limit";
import dotenv from "dotenv";

dotenv.config();

// Cloudflare R2 S3 API compatible client
const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || "https://your-account-id.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const bucket = process.env.R2_BUCKET || "words";
const concurrency = Number(process.env.UPLOAD_CONCURRENCY || 24);
const limit = pLimit(concurrency);
const verboseLogs = process.env.UPLOAD_VERBOSE === "1";
// Har bir yozish so'rovi (fayl/hash/mtime) shuncha marta urinadi —
// tarmoq uzilishi ("socket hang up" kabi) bitta faylni butun
// yuklashni yiqitmasin uchun.
const maxAttempts = Number(process.env.UPLOAD_RETRIES || 3);
const retryBaseDelayMs = Number(process.env.UPLOAD_RETRY_DELAY_MS || 500);
// mtime'i oxirgi muvaffaqiyatli yuklashdagi bilan bir xil fayllarni
// o'tkazib yuborish o'rniga barchasini majburan qayta yuklash.
const forceUpload = process.env.UPLOAD_FORCE === "1" || process.argv.includes("--force");
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, "..", "assets");
const versionDir = join(root, ".v");
const hashDir = join(root, ".hash");
const ignoreFile = join(root, ".ignore");
const fileIgnoreFile = join(root, ".fignore");

console.log(chalk.blue.bold("🚀 Cloudflare R2 ga upload..."));
console.log(chalk.blue(`📦 Manbai: ${root}`));
console.log(chalk.blue(`☁️  Maqsad: ${bucket} bucket`));
console.log(chalk.blue(`⚡ Parallel upload: ${concurrency}`));
console.log(chalk.blue(`🔁 Har bir so'rov uchun urinishlar: ${maxAttempts}`));
console.log(
  forceUpload
    ? chalk.yellow("🔨 --force: barcha fayllar o'zgarganmi-yo'qmi tekshirilmasdan qayta yuklanadi")
    : chalk.blue("⏩ O'zgarmagan fayllar avtomatik o'tkazib yuboriladi")
);
console.log(chalk.blue("-".repeat(60)));

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
    .map((line) => line.replace(/^\/+/, "").replace(/\\/g, "/"));
}

// Read .fignore file
let fileIgnorePatterns = [];
if (existsSync(fileIgnoreFile)) {
  fileIgnorePatterns = readFileSync(fileIgnoreFile, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.endsWith(".sha256"))
    .map((line) => line.replace(/^\/+/, "").replace(/\\/g, "/"));
}

/* --- Xato bo'lganda avtomatik qayta urinish (eksponensial kutish bilan) ---
   `attempt()` har chaqirilganda YANGI so'rov tuzishi kerak — masalan
   fayl oqimi (createReadStream) faqat bir marta o'qilishi mumkin,
   shuning uchun uni qayta ishlatib bo'lmaydi. */
async function withRetry(attempt, label) {
  let lastErr;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      return await attempt();
    } catch (err) {
      lastErr = err;
      if (i < maxAttempts) {
        const delay = retryBaseDelayMs * 2 ** (i - 1);
        if (verboseLogs) {
          console.log(chalk.yellow(`  ↻ ${label}: urinish ${i}/${maxAttempts} muvaffaqiyatsiz (${err.message}), ${delay}ms kutilmoqda...`));
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastErr;
}

/* --- Oxirgi muvaffaqiyatli yuklashda saqlangan mtime'ni o'qish ---
   (fayl hali umuman yuklanmagan bo'lsa `null` qaytaradi — bu holda
   albatta yuklanishi kerak). */
function readPreviousMtime(file) {
  const mtimeFilePath = join(versionDir, file);
  if (!existsSync(mtimeFilePath)) {
    return null;
  }
  return readFileSync(mtimeFilePath, "utf8").trim();
}

/* --- Calculate SHA-256 hash for a file --- */
function calculateFileHash(filePath) {
  const fileBuffer = readFileSync(filePath);
  return createHash("sha256").update(fileBuffer).digest("hex");
}

/* --- Get or create hash file path --- */
function getOrCreateHashFile(filePath) {
  const hashFilePath = join(hashDir, filePath) + ".sha256";
  const hashS3Key = `.hash/${filePath}.sha256`;
  return { hashFilePath, hashS3Key };
}

/* --- Get or create mtime file path --- */
function getOrCreateMtimeFile(filePath) {
  const mtimeFilePath = join(versionDir, filePath);
  const mtimeS3Key = `.v/${filePath}`;
  let mtime = "0";

  if (existsSync(mtimeFilePath)) {
    mtime = readFileSync(mtimeFilePath, "utf8").trim();
  } else {
    mkdirSync(dirname(mtimeFilePath), { recursive: true });
    writeFileSync(mtimeFilePath, "0", "utf8");
  }

  return { mtimeFilePath, mtimeS3Key, mtime };
}

/* --- Check if file is in ignored folder --- */
function isIgnoredForVersioning(file) {
  return ignorePatterns.some((pattern) => file.startsWith(pattern));
}

/* --- Check if file should skip hash/version metadata --- */
function isSkippedForMetadata(file) {
  return isIgnoredForVersioning(file) || fileIgnorePatterns.some((pattern) => file.startsWith(pattern));
}

/* --- Update local hash file --- */
function updateLocalHashFile(file) {
  if (isSkippedForMetadata(file)) {
    return false;
  }

  const fullPath = join(root, file);
  const { hashFilePath } = getOrCreateHashFile(file);

  try {
    const hash = calculateFileHash(fullPath);
    mkdirSync(dirname(hashFilePath), { recursive: true });
    writeFileSync(hashFilePath, hash, "utf8");
    if (verboseLogs) {
      console.log(chalk.magenta(`🔑 Hash: ${hashFilePath}`));
    }
    return true;
  } catch (err) {
    console.error(chalk.red(`✖ Hash xatosi ${file}: ${err.message}`));
    return false;
  }
}

/* --- Update local mtime file --- */
function updateLocalMtimeFile(file, newMtime) {
  if (isSkippedForMetadata(file)) {
    return true;
  }

  const { mtimeFilePath } = getOrCreateMtimeFile(file);
  try {
    mkdirSync(dirname(mtimeFilePath), { recursive: true });
    writeFileSync(mtimeFilePath, newMtime, "utf8");
    if (verboseLogs) {
      console.log(chalk.cyan(`📝 Mtime: ${mtimeFilePath}`));
    }
    return true;
  } catch (err) {
    console.error(chalk.red(`✖ Mtime xatosi: ${err.message}`));
    return false;
  }
}

/* --- Upload file to R2 (normalized, qayta urinish bilan) --- */
async function uploadFile(file, fullPath) {
  const key = file;
  const { size } = statSync(fullPath);

  try {
    await withRetry(
      () =>
        s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          // Har bir urinishda yangi oqim — createReadStream faqat
          // bir marta o'qilishi mumkin.
          Body: createReadStream(fullPath),
          ContentType: mime.getType(key) || "application/octet-stream",
          CacheControl: "public,max-age=31536000,immutable",
        })),
      key,
    );
    if (verboseLogs) {
      console.log(chalk.green(`✔ Uploaded ${key} (${(size / 1024).toFixed(2)} KB)`));
    }
    return true;
  } catch (err) {
    console.error(chalk.red(`✖ Upload xatosi ${key} (${maxAttempts} urinishdan keyin): ${err.message}`));
    return false;
  }
}

/* --- Upload hash file to R2 --- */
async function uploadHashFile(file) {
  if (isSkippedForMetadata(file)) {
    return true;
  }

  const { hashFilePath, hashS3Key } = getOrCreateHashFile(file);
  if (!existsSync(hashFilePath)) {
    console.warn(chalk.yellow(`⚠ Hash missing: ${hashFilePath}`));
    return false;
  }

  try {
    const hashBody = readFileSync(hashFilePath);
    await withRetry(
      () =>
        s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: hashS3Key,
          Body: hashBody,
          ContentType: "text/plain",
          CacheControl: "public,max-age=31536000,immutable",
        })),
      hashS3Key,
    );
    if (verboseLogs) {
      console.log(chalk.green(`✔ Hash uploaded`));
    }
    return true;
  } catch (err) {
    console.error(chalk.red(`✖ Hash upload xatosi ${hashS3Key} (${maxAttempts} urinishdan keyin): ${err.message}`));
    return false;
  }
}

/* --- Upload mtime file to R2 --- */
async function uploadMtimeFile(file) {
  if (isSkippedForMetadata(file)) {
    return true;
  }

  const { mtimeFilePath, mtimeS3Key } = getOrCreateMtimeFile(file);
  if (!existsSync(mtimeFilePath)) {
    console.warn(chalk.yellow(`⚠ Mtime missing: ${mtimeFilePath}`));
    return false;
  }

  try {
    const mtimeBody = readFileSync(mtimeFilePath);
    await withRetry(
      () =>
        s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: mtimeS3Key,
          Body: mtimeBody,
          ContentType: "text/plain",
          CacheControl: "public,max-age=31536000,immutable",
        })),
      mtimeS3Key,
    );
    if (verboseLogs) {
      console.log(chalk.green(`✔ Mtime uploaded`));
    }
    return true;
  } catch (err) {
    console.error(chalk.red(`✖ Mtime upload xatosi ${mtimeS3Key} (${maxAttempts} urinishdan keyin): ${err.message}`));
    return false;
  }
}

/* --- Recursively walk local dir --- */
function walk(dir) {
  const files = [];
  const dirEntries = readdirSync(dir, { withFileTypes: true });

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
        const fileKey = relative(root, fullPath).replace(/\\/g, "/");
        files.push(fileKey);
        bar.tick();
      } else if (entry.isDirectory()) {
        walkRecursive(fullPath);
      }
    }
  }

  walkRecursive(dir);
  return files;
}

/* --- Main logic --- */
(async () => {
  console.log(chalk.blue.bold("🚀 Starting R2 upload..."));

  // 1. Fayllarni skanerlaash
  console.log(chalk.yellow("\n🔍 Scanning local files..."));
  const localFiles = walk(root);
  console.log(chalk.blue(`Found ${localFiles.length} files\n`));

  // 2. Upload qilish
  const uploadBar = new ProgressBar(
    chalk.blue(
      "Uploading [:bar] :percent :current/:total (:etas remaining)"
    ),
    {
      total: localFiles.length,
      width: 40,
      complete: "=",
      incomplete: " ",
    }
  );

  // Qaysi fayllar (va qaysi bosqichda — fayl/hash/mtime) muvaffaqiyatsiz
  // bo'lganini kuzatib boramiz, aks holda oxirida xato bo'lsa ham
  // "successfully" deb yolg'on chiqarib yuborardi.
  const failedFiles = new Set();
  // mtime oxirgi yuklashdagi bilan bir xil bo'lgani uchun butunlay
  // o'tkazib yuborilgan fayllar (--force yoki UPLOAD_FORCE=1 bo'lsa
  // doim bo'sh qoladi).
  const skippedFiles = new Set();

  async function processFile(file) {
    const fullPath = join(root, file);

    if (!existsSync(fullPath)) {
      console.warn(chalk.yellow(`⚠ Missing: ${fullPath}`));
      failedFiles.add(file);
      return;
    }

    const localStats = statSync(fullPath);
    const newMtime = localStats.mtimeMs.toString();
    const skipMetadata = isSkippedForMetadata(file);

    // .ignore/.fignore'dagi fayllar uchun versiya kuzatilmaydi,
    // shuning uchun ular uchun "o'zgarmadi" deb bila olmaymiz —
    // xavfsizlik uchun ularni har doim qayta yuklaymiz.
    if (!skipMetadata && !forceUpload) {
      const previousMtime = readPreviousMtime(file);
      if (previousMtime !== null && previousMtime === newMtime) {
        skippedFiles.add(file);
        if (verboseLogs) {
          console.log(chalk.gray(`⏩ O'zgarmagan, o'tkazib yuborildi: ${file}`));
        }
        return;
      }
    }

    const fileUploaded = await uploadFile(file, fullPath);
    if (!fileUploaded) {
      failedFiles.add(file);
      return;
    }

    if (skipMetadata) {
      return;
    }

    updateLocalMtimeFile(file, newMtime);
    const mtimeUploaded = await uploadMtimeFile(file);
    if (!mtimeUploaded) failedFiles.add(file);

    updateLocalHashFile(file);
    const hashUploaded = await uploadHashFile(file);
    if (!hashUploaded) failedFiles.add(file);
  }

  await Promise.all(
    localFiles.map((file) =>
      limit(async () => {
        try {
          await processFile(file);
        } finally {
          uploadBar.tick();
        }
      })
    )
  );

  console.log(chalk.blue("-".repeat(60)));

  const uploadedCount = localFiles.length - failedFiles.size - skippedFiles.size;
  if (skippedFiles.size > 0) {
    console.log(chalk.gray(`⏩ ${skippedFiles.size} ta fayl o'zgarmagani uchun o'tkazib yuborildi (--force bilan majburlash mumkin)`));
  }

  if (failedFiles.size === 0) {
    console.log(
      chalk.green.bold(
        `✔️  Upload completed successfully! (${uploadedCount} yuklandi, ${skippedFiles.size} o'tkazib yuborildi, jami ${localFiles.length} fayl)`
      )
    );
  } else {
    const failedList = [...failedFiles];
    console.log(
      chalk.red.bold(
        `⚠️  Upload ${failedFiles.size} ta xato bilan tugadi (${uploadedCount} yuklandi, ${skippedFiles.size} o'tkazib yuborildi, ${failedFiles.size} xato — jami ${localFiles.length}).`
      )
    );
    console.log(chalk.red("Muvaffaqiyatsiz fayllar:"));
    for (const file of failedList.slice(0, 30)) {
      console.log(chalk.red(`  - ${file}`));
    }
    if (failedList.length > 30) {
      console.log(chalk.red(`  ... va yana ${failedList.length - 30} ta`));
    }
    console.log(chalk.yellow(`\nBitta faylni qayta yuklash uchun: node retry-file.js <fayl-yo'li>`));
    process.exitCode = 1;
  }
})();
