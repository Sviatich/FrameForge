import { SiteDisclaimer, SiteHeader } from "@/components/site/site-links";
import styles from "@/components/site/info-page.module.css";

// Статическая страница с пользовательской инструкцией по работе с сервисом.
export default function DocPage() {
  return (
    <main className={styles.page}>
      <SiteHeader />
      <section className={styles.card}>

        <h1 className={styles.title}>Документация</h1>
        <p className={styles.lead}>
          Короткая инструкция по работе с сервисом: подключите Figma, вставьте ссылку на файл, выберите frame и
          откройте рабочую область с превью и кодом.
        </p>

        <section className={styles.section}>
          <h2>Как начать</h2>
          <ul>
            <li>Подключите аккаунт Figma через OAuth.</li>
            <li>Вставьте ссылку на макет в главное поле на стартовом экране.</li>
            <li>Нажмите «Загрузить макет» и дождитесь списка доступных frame.</li>
            <li>Выберите нужный frame, после чего откроется рабочая область проекта.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Что доступно в рабочей области</h2>
          <ul>
            <li>Переключение между вкладками «Превью» и «Код».</li>
            <li>Просмотр структуры файлов и исходного кода проекта.</li>
            <li>Экспорт сгенерированного результата архивом.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Ограничения текущей версии</h2>
          <p>
            Точность генерации зависит от структуры исходного Figma-макета: Auto Layout, вложенность фреймов, стили
            текста, изображений и векторных элементов. Чем аккуратнее собран макет, тем стабильнее итоговый результат.
          </p>
        </section>
      </section>

      <SiteDisclaimer />
    </main>
  );
}
