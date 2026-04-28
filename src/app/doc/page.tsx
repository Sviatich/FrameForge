import Image from "next/image";
import { SiteDisclaimer, SiteHeader } from "@/components/site/site-links";
import styles from "@/components/site/info-page.module.css";

// Статическая страница с пользовательской инструкцией по работе с сервисом.
export default function DocPage() {
  return (
    <main className={styles.page}>
      <SiteHeader />
      <section className={styles.card}>
        <h1 className={styles.title}>Документация</h1>

        <Image
          className={styles.heroImage}
          src="/info-pages/docs-v2.webp"
          width={1536}
          height={1024}
          alt="Иллюстрация раздела документации"
          priority
        />

        <div className={styles.content}>
          <p className={styles.lead}>
            Документация описывает основной сценарий работы с FrameForge: подключение Figma, загрузку макета, выбор
            frame, генерацию кода, просмотр результата и экспорт готового проекта.
          </p>

          <section className={styles.section}>
            <h2>Как начать</h2>
            <ul>
              <li>Нажмите кнопку подключения и авторизуйтесь через Figma OAuth.</li>
              <li>Скопируйте ссылку на Figma-файл или конкретный frame.</li>
              <li>Вставьте ссылку на главной странице и запустите загрузку макета.</li>
              <li>После загрузки выберите frame в боковой панели рабочей области.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Рабочая область</h2>
            <ul>
              <li>Во вкладке «Превью» отображается сгенерированная HTML-страница в изолированном iframe.</li>
              <li>Переключатели устройств позволяют проверить отображение в desktop, tablet и mobile-режимах.</li>
              <li>Во вкладке «Код» доступна структура файлов и подсветка содержимого generated-проекта.</li>
              <li>Кнопка экспорта собирает HTML, CSS и локализованные изображения в ZIP-архив.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Рекомендации к макету</h2>
            <p>
              Для более стабильной генерации желательно использовать Auto Layout, понятные названия слоев, аккуратную
              вложенность, единые текстовые стили и корректно настроенные изображения. Чем ближе макет к логической
              структуре веб-страницы, тем точнее итоговый код.
            </p>
          </section>
        </div>
      </section>

      <SiteDisclaimer />
    </main>
  );
}
