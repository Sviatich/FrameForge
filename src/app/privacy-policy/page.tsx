import Image from "next/image";
import { SiteDisclaimer, SiteHeader } from "@/components/site/site-links";
import styles from "@/components/site/info-page.module.css";

// Статическая страница с описанием того, какие данные используются при интеграции с Figma.
export default function PrivacyPolicyPage() {
  return (
    <main className={styles.page}>
      <SiteHeader />
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
              структуру страниц, frame, слои, размеры, стили, текстовые параметры и ссылки на изображения. Эти данные
              нужны только для построения предпросмотра и генерации HTML/CSS-кода.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Разрешения Figma API</h2>
            <p>
              В настройках Figma API доступ разбит на отдельные разрешения. FrameForge использует сценарий чтения
              макета и не требует прав на изменение файлов, комментариев, библиотек, Dev Resources, Code Connect или
              webhooks.
            </p>
            <ul>
              <li>
                <strong>current_user:read</strong> — позволяет прочитать базовую информацию о пользователе: имя,
                email и изображение профиля. Для генерации кода это разрешение не является обязательным.
              </li>
              <li>
                <strong>file_content:read</strong> — позволяет читать содержимое файла и получать изображения из
                макета. Это ключевое разрешение для работы FrameForge: оно нужно, чтобы загрузить структуру frame,
                текст, размеры, стили и ассеты.
              </li>
              <li>
                <strong>file_metadata:read</strong> — позволяет читать метаданные файла. Такие данные могут быть
                полезны для отображения общей информации, но основная генерация строится на содержимом файла.
              </li>
              <li>
                <strong>file_comments:read</strong> и <strong>file_comments:write</strong> — отвечают за чтение,
                создание, изменение и удаление комментариев. FrameForge не работает с комментариями.
              </li>
              <li>
                <strong>file_versions:read</strong> — дает доступ к истории версий файла. Приложение не использует
                историю версий при генерации.
              </li>
              <li>
                <strong>file_variables:read</strong>, <strong>file_variables:write</strong>,
                <strong>library_analytics:read</strong>, <strong>library_assets:read</strong>,
                <strong>library_content:read</strong> и <strong>team_library_content:read</strong> — относятся к
                дизайн-системам, библиотекам, компонентам, стилям, переменным и аналитике. Эти разрешения не требуются
                для текущего сценария преобразования выбранного frame.
              </li>
              <li>
                <strong>file_code_connect:write</strong>, <strong>file_dev_resources:read</strong> и
                <strong>file_dev_resources:write</strong> — относятся к возможностям разработки, Code Connect и Dev
                Resources. FrameForge не записывает такие данные в Figma.
              </li>
              <li>
                <strong>webhooks:read</strong> и <strong>webhooks:write</strong> — позволяют читать и изменять
                webhooks. Приложение не создает и не использует webhooks.
              </li>
            </ul>
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
