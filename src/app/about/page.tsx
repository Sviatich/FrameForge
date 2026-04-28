import Image from "next/image";
import { SiteDisclaimer, SiteHeader } from "@/components/site/site-links";
import styles from "@/components/site/info-page.module.css";

// Статическая страница с кратким описанием идеи и архитектуры проекта.
export default function AboutPage() {
  return (
    <main className={styles.page}>
      <SiteHeader />
      <section className={styles.card}>
        <h1 className={styles.title}>О проекте</h1>

        <Image
          className={styles.heroImage}
          src="/info-pages/aboutus-v2.webp"
          width={1536}
          height={1024}
          alt="Иллюстрация раздела о проекте"
          priority
        />

        <div className={styles.content}>
          <p className={styles.lead}>
            FrameForge — это веб-приложение для автоматического преобразования Figma-макетов в статический
            HTML/CSS-код с предпросмотром и экспортом результата.
          </p>

          <section className={styles.section}>
            <h2>Идея проекта</h2>
            <p>
              Проект решает задачу ускорения перехода от дизайн-макета к рабочему веб-прототипу. Пользователь
              подключает Figma, вставляет ссылку на файл, выбирает нужный frame и получает сгенерированную структуру
              проекта, которую можно изучить, проверить в предпросмотре и скачать.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Как устроена система</h2>
            <p>
              В основе приложения находится конвейер обработки данных: загрузка Figma JSON, нормализация узлов,
              определение семантики элементов интерфейса, генерация HTML/CSS и подготовка результата к экспорту.
              Такой подход разделяет интеграцию с Figma, бизнес-логику и пользовательский интерфейс.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Практическая ценность</h2>
            <p>
              FrameForge может использоваться как демонстрационный инструмент для анализа design-to-code-подхода:
              он показывает, какие данные можно извлечь из Figma, как их интерпретировать и какие ограничения возникают
              при автоматической генерации интерфейсного кода.
            </p>
          </section>
        </div>
      </section>

      <SiteDisclaimer />
    </main>
  );
}
