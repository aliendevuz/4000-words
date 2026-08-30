import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: server kerak emas, hozirgi static hosting o'zgarmaydi
  output: "export",
  // Static hostingda /word/afraid -> /word/afraid/index.html
  trailingSlash: true,
  images: {
    // Static export'da Next image optimizer yo'q
    unoptimized: true,
  },
};

export default nextConfig;
