import Image from "next/image";
import { HomeLink, SiteDisclaimer } from "@/components/site/site-links";
import styles from "@/components/site/info-page.module.css";

// Статическая страница с описанием того, какие данные используются при интеграции с Figma.
export default function PrivacyPolicyPage() {
  return (
    <main className={styles.page}>
      <HomeLink className={styles.homeLink} />
      <section className={styles.card}>
        <h1 className={styles.title}>Политика конфиденциальности</h1>

        <Image
          className={styles.heroImage}
          src="/info-pages/privacypolicy-v2.webp"
          width={1536}
          height={1024}
          alt="Иллюстрация раздела политики конфиденциальности"
          priority
        />

        <div className={styles.content}>
          <p className={styles.lead}>
            FrameForge использует доступ к Figma только для чтения структуры макетов, которые пользователь сам
            передает в приложение по ссылке.
          </p>

          <section className={styles.section}>
            <h2>Какие данные используются</h2>
            <p>
              После подключения через OAuth приложение получает возможность читать содержимое выбранного Figma-файла:
              структуру страниц, frames, слои, размеры блоков, стили, текстовые параметры и ссылки на изображения. Эти данные
              нужны только для построения предпросмотра и генерации HTML/CSS-кода.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Разрешения Figma API</h2>
            <p>
              Для работы FrameForge нужны только разрешения на чтение. Приложение не запрашивает права на изменение
              файлов, комментариев, библиотек, Dev Resources, Code Connect или webhooks.
            </p>
            <ul>
              <li>
                <strong>file_content:read</strong> — основное разрешение приложения. Оно нужно, чтобы загрузить
                структуру выбранного Figma-файла: страницы, frame, слои, координаты, размеры, Auto Layout, текстовые
                стили, цвета, эффекты и ссылки на изображения. Без этого доступа сервис не сможет разобрать макет и
                сгенерировать HTML/CSS-код.
              </li>
              <li>
                <strong>file_metadata:read</strong> — разрешение на чтение базовой информации о Figma-файле:
                названия, доступных страниц, связанных метаданных и служебных сведений, которые помогают корректно
                определить выбранный пользователем файл без доступа на изменение.
              </li>
            </ul>
            <p>
              Разрешения из категории Design System, например <strong>library_assets:read</strong>,{" "}
              <strong>library_content:read</strong> и <strong>team_library_content:read</strong>, FrameForge не
              использует для текущего сценария загрузки одного макета по ссылке.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Что сохраняется</h2>
            <p>
              Текущая рабочая сессия хранится в браузере пользователя через sessionStorage. Сгенерированный проект не
              записывается в базу данных и не сохраняется на сервере между запросами. OAuth-сессия хранится в cookie,
              чтобы сервер мог выполнять запросы к Figma API от имени подключенного пользователя.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Управление доступом</h2>
            <p>
              Пользователь может в любой момент сменить аккаунт или завершить сессию через интерфейс приложения. После
              выхода cookie с OAuth-данными очищаются, и новые запросы к Figma API не выполняются до повторного
              подключения.
            </p>
          </section>
        </div>
      </section>

      <SiteDisclaimer />
    </main>
  );
}
