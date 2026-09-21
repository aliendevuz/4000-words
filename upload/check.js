import { createHash } from "crypto";
import fetch from "node-fetch"; // Node 18+ bo'lsa, global fetch ishlatishingiz mumkin

// 1. Hash hisoblash
async function calculateSHA256FromBuffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

// 2. Validatsiya funksiyasi
async function validateRemoteFile(fileUrl, hashUrl) {
  // Faylni yuklab olish
  console.log("⬇️ Yuklab olinmoqda:", fileUrl);
  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) {
    throw new Error(`❌ Faylni yuklab bo'lmadi: ${fileRes.status}`);
  }
  const fileBuffer = Buffer.from(await fileRes.arrayBuffer());

  // Local hash hisoblash
  const localHash = await calculateSHA256FromBuffer(fileBuffer);
  console.log("📂 Hisoblangan hash:", localHash);

  // Remote hashni yuklab olish
  console.log("⬇️ Yuklab olinmoqda:", hashUrl);
  const hashRes = await fetch(hashUrl);
  if (!hashRes.ok) {
    throw new Error(`❌ Hash faylni yuklab bo'lmadi: ${hashRes.status}`);
  }
  const remoteHash = (await hashRes.text()).trim();
  console.log("🌐 Remote hash:", remoteHash);

  // Taqqoslash
  if (localHash === remoteHash) {
    console.log("✅ Fayl to‘liq va buzilmagan!");
  } else {
    console.log("❌ Fayl noto‘g‘ri yoki buzilgan!");
  }
}

// Misol ishlatish
validateRemoteFile(
  "https://assets.4000.uz/assets/en/essential/words.json",
  "https://assets.4000.uz/assets/.hash/en/essential/words.json.sha256"
);
