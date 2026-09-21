// Bitta faylni qayta yuklash — butun assets/ papkasini qayta
// skanerlamasdan, tarmoq uzilishi tufayli muvaffaqiyatsiz bo'lgan
// yagona faylni tuzatish uchun. upr2.js bilan bir xil mantiq
// (fayl + .hash + .v), faqat bitta yo'l uchun.
//
// Ishlatish: node retry-file.js en/essential/picture/0/8/11.jpg
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { statSync, existsSync, readFileSync, writeFileSync, mkdirSync, createReadStream } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import mime from "mime"
import chalk from "chalk"
import { createHash } from "crypto"
import dotenv from "dotenv"

dotenv.config()

const file = process.argv[2]
if (!file) {
  console.error(chalk.red("Foydalanish: node retry-file.js <relative/path/in/assets.ext>"))
  process.exit(1)
}

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

const bucket = process.env.R2_BUCKET || "words"
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..", "assets")
const fullPath = join(root, file)

if (!existsSync(fullPath)) {
  console.error(chalk.red(`✖ Fayl topilmadi: ${fullPath}`))
  process.exit(1)
}

async function put(key, body, contentType) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public,max-age=31536000,immutable",
    }),
  )
}

;(async () => {
  console.log(chalk.blue(`⬆️  Qayta yuklanmoqda: ${file}`))

  await put(file, createReadStream(fullPath), mime.getType(file) || "application/octet-stream")
  console.log(chalk.green(`✔ Fayl yuklandi (${(statSync(fullPath).size / 1024).toFixed(2)} KB)`))

  const hash = createHash("sha256").update(readFileSync(fullPath)).digest("hex")
  const hashPath = join(root, ".hash", file) + ".sha256"
  mkdirSync(dirname(hashPath), { recursive: true })
  writeFileSync(hashPath, hash, "utf8")
  await put(`.hash/${file}.sha256`, hash, "text/plain")
  console.log(chalk.green(`✔ Hash yangilandi: ${hash}`))

  const mtime = statSync(fullPath).mtimeMs.toString()
  const mtimePath = join(root, ".v", file)
  mkdirSync(dirname(mtimePath), { recursive: true })
  writeFileSync(mtimePath, mtime, "utf8")
  await put(`.v/${file}`, mtime, "text/plain")
  console.log(chalk.green(`✔ Versiya (mtime) yangilandi: ${mtime}`))

  console.log(chalk.green.bold("\nTayyor."))
})().catch((err) => {
  console.error(chalk.red(`✖ Xato: ${err.message}`))
  process.exit(1)
})
