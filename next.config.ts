import type { NextConfig } from "next";

// Глобальная конфигурация Next.js для всего приложения.
const nextConfig: NextConfig = {
  // Отключаем dev-indicator Next в углу экрана, чтобы интерфейс оставался чище.
  devIndicators: false,
};

export default nextConfig;
