/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "pdf-parse",
      "canvas",
      "tesseract.js",
      "pdfjs-dist",
    ],
  },
};

export default nextConfig;
