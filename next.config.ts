import type { NextConfig } from "next";

// Глобальная конфигурация Next.js для всего приложения.
const nextConfig: NextConfig = {
  // Отключаем dev-indicator Next в углу экрана, чтобы интерфейс оставался чище.
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "misis.ru",
        pathname: "/files/**",
      },
    ],
  },
};

export default nextConfig;
