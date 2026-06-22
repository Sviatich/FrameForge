import type { Metadata } from "next";
import Image from "next/image";
import { ReviewGuide } from "./review-access";
import styles from "./review.module.css";

export const metadata: Metadata = {
  title: "Инструкция по проверке | FrameForge",
  description: "Инструкция и тестовые данные для проверки работы веб-сервиса FrameForge.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export const dynamic = "force-dynamic";

export default function ReviewPage() {
  const figmaUrl = process.env.REVIEW_FIGMA_URL ?? "";
  const login = process.env.REVIEW_FIGMA_LOGIN ?? "";
  const password = process.env.REVIEW_FIGMA_PASSWORD ?? "";
  const serviceUrl = process.env.REVIEW_SERVICE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "/";

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <Image
            className={styles.misisLogo}
            src="https://misis.ru/files/-/dbfd60c08f13104d63a4652ea7c43c68/misis_logo_black_rus.svg"
            alt="Университет МИСИС"
            width={300}
            height={110}
            priority
          />
          <h1>Инструкция по проверке приложения</h1>
        </header>

        <ReviewGuide figmaUrl={figmaUrl} login={login} password={password} serviceUrl={serviceUrl} />
      </section>
    </main>
  );
}
