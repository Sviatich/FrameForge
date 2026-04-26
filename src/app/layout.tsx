import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Корневой layout приложения: подключает шрифты, глобальные стили и провайдеры.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FrameForge",
  description: "Сервис для поэтапной трансляции Figma-макетов в код через parser, transformer, generator и exporter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} ${jetBrainsMono.variable}`}>
      <body>
        {/* Подключаем клиентские провайдеры один раз на все приложение. */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
