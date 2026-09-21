import { createHash } from "crypto";
import https from "https";
import { writeFileSync } from "fs";
import chalk from "chalk";

/* --- URL dan faylni yuklab olish --- */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = Buffer.alloc(0);

      response.on("data", (chunk) => {
        data = Buffer.concat([data, chunk]);
      });

      response.on("end", () => {
        resolve({
          data,
          headers: response.headers,
          statusCode: response.statusCode,
        });
      });

      response.on("error", reject);
    });
  });
}

/* --- SHA-256 hash hisoblash --- */
function calculateHash(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

/* --- Fayllar farqini tahlil qilish --- */
function analyzeFileDifference(s3Data, githubData) {
  console.log(chalk.blue.bold("\n📊 Fariqni tahlil qilish:"));
  console.log(chalk.blue("─".repeat(60)));

  // O'lchami farqi
  console.log(
    chalk.white(
      `📏 S3 fayli o'lchami: ${s3Data.length} bayt | GitHub ravshanasi: ${githubData.length} bayt`
    )
  );

  if (s3Data.length !== githubData.length) {
    console.log(chalk.yellow(`⚠️  O'lchami farq: ${Math.abs(s3Data.length - githubData.length)} bayt`));
  }

  // Encoding tekshirish
  console.log(chalk.white("\n🔤 Encoding / Line Ending tahlili:"));

  const s3HasCRLF = s3Data.includes(Buffer.from("\r\n"));
  const githubHasCRLF = githubData.includes(Buffer.from("\r\n"));

  console.log(`   S3: ${s3HasCRLF ? "CRLF (\\r\\n)" : "LF (\\n)"}`);
  console.log(`   GitHub: ${githubHasCRLF ? "CRLF (\\r\\n)" : "LF (\\n)"}`);

  // BOM tekshirish
  const s3BOM = s3Data.slice(0, 3).toString("hex");
  const githubBOM = githubData.slice(0, 3).toString("hex");

  console.log(`\n📝 BOM (Byte Order Mark):`);
  console.log(`   S3 boshi: ${s3BOM || "BOM yo'q"}`);
  console.log(`   GitHub boshi: ${githubBOM || "BOM yo'q"}`);

  // Birinchi farqli bayt
  console.log(chalk.white(`\n🔍 Birinchi farqli bayt topish:`));
  let firstDiffIndex = -1;
  for (let i = 0; i < Math.min(s3Data.length, githubData.length); i++) {
    if (s3Data[i] !== githubData[i]) {
      firstDiffIndex = i;
      break;
    }
  }

  if (firstDiffIndex !== -1) {
    const contextStart = Math.max(0, firstDiffIndex - 20);
    const contextEnd = Math.min(s3Data.length, firstDiffIndex + 20);

    console.log(`   Farq #${firstDiffIndex} pozitsiyada`);
    console.log(
      `   S3 konteksti: ${s3Data.slice(contextStart, contextEnd).toString("utf8").replace(/\r/g, "\\r").replace(/\n/g, "\\n")}`
    );
    console.log(
      `   GitHub konteksti: ${githubData.slice(contextStart, contextEnd).toString("utf8").replace(/\r/g, "\\r").replace(/\n/g, "\\n")}`
    );
  } else if (s3Data.length === githubData.length) {
    console.log(chalk.green("   ✔️  Barcha baytlar bir xil!"));
  } else {
    console.log(chalk.yellow(`   ⚠️  Fayllar turli uzunlikka ega`));
  }

  // JSON tahlili (agar valid JSON bo'lsa)
  console.log(chalk.white(`\n📋 JSON tahlili:`));
  try {
    const s3Json = JSON.parse(s3Data.toString("utf8"));
    const githubJson = JSON.parse(githubData.toString("utf8"));

    console.log(`   S3 JSON structurasi: ${JSON.stringify(s3Json).length} bayt`);
    console.log(`   GitHub JSON structurasi: ${JSON.stringify(githubJson).length} bayt`);

    if (JSON.stringify(s3Json) === JSON.stringify(githubJson)) {
      console.log(chalk.green(`   ✔️  JSON ma'lumotlari bir xil!`));
      console.log(chalk.yellow(`   ⚠️  Lekin formatting/whitespace farq qilib ketgan`));
    } else {
      console.log(chalk.red(`   ✖️  JSON ma'lumotlari ham boshqa!`));
    }
  } catch (e) {
    console.log(chalk.gray(`   JSON tahlil qila olmadim: ${e.message}`));
  }
}

/* --- Main script --- */
(async () => {
  console.log(chalk.blue.bold("🔐 AWS S3 va Cloudflare R2 hash solishtiruvi\n"));

  const s3Url = "https://assets.4000.uz/assets/en/essential/words.json";
  const r2Url =
    "https://pub-6e47b1773dc442dc969c5d51b2cfe125.r2.dev/en/essential/words.json";

  try {
    // S3 dan yuklab olish
    console.log(chalk.cyan(`📥 AWS S3 dan yuklab olinmoqda: ${s3Url}`));
    const s3Response = await fetchUrl(s3Url);

    if (s3Response.statusCode !== 200) {
      console.error(chalk.red(`✖️  S3 Error: ${s3Response.statusCode}`));
      process.exit(1);
    }

    const s3Hash = calculateHash(s3Response.data);
    console.log(chalk.green(`✔️  S3 yuklab olindi (${s3Response.data.length} bayt)`));
    console.log(chalk.green(`🔐 S3 SHA-256: ${chalk.yellow(s3Hash)}`));

    // R2 dan yuklab olish
    console.log(
      chalk.cyan(
        `\n📥 Cloudflare R2 dan yuklab olinmoqda: ${r2Url}`
      )
    );
    const r2Response = await fetchUrl(r2Url);

    if (r2Response.statusCode !== 200) {
      console.error(chalk.red(`✖️  R2 Error: ${r2Response.statusCode}`));
      process.exit(1);
    }

    const r2Hash = calculateHash(r2Response.data);
    console.log(chalk.green(`✔️  R2 yuklab olindi (${r2Response.data.length} bayt)`));
    console.log(chalk.green(`🔐 R2 SHA-256: ${chalk.yellow(r2Hash)}`));

    // Solishtiruv
    console.log(chalk.blue.bold("\n🔀 SOLISHTIRUV NATIJALARI:"));
    console.log(chalk.blue("─".repeat(60)));

    if (s3Hash === r2Hash) {
      console.log(chalk.green.bold("✔️  HASHLAR BIR XIL! Migratsiya muvaffaqiyatli!"));
    } else {
      console.log(chalk.red.bold("✖️  HASHLAR BOSHQA! Fayllar farqli."));
      console.log(`\n   S3 hash:  ${chalk.yellow(s3Hash)}`);
      console.log(`   R2 hash:  ${chalk.yellow(r2Hash)}`);

      // Farqni tahlil qilish
      analyzeFileDifference(s3Response.data, r2Response.data);
    }

    // Fayllarni saqlash (debug uchun)
    writeFileSync("s3_downloaded.json", s3Response.data);
    writeFileSync("r2_downloaded.json", r2Response.data);
    console.log(chalk.gray("\n📁 Yuklangan fayllar saqlandi: s3_downloaded.json, r2_downloaded.json"));

  } catch (err) {
    console.error(chalk.red(`✖️  Xato: ${err.message}`));
    process.exit(1);
  }
})();
