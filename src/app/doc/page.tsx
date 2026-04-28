import Image from "next/image";
import { HomeLink, SiteDisclaimer } from "@/components/site/site-links";
import styles from "@/components/site/info-page.module.css";

// Статическая страница с пользовательской инструкцией по работе с сервисом.
export default function DocPage() {
  return (
    <main className={styles.page}>
      <HomeLink className={styles.homeLink} />
      <section className={styles.card}>
        <h1 className={styles.title}>Инструкции</h1>

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
            В данной инструкции описывается основной сценарий работы с FrameForge: подключение Figma, загрузку макета, выбор
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
              <li>Во вкладке «Превью» отображается сгенерированная HTML-страница.</li>
              <li>Переключатели устройств позволяют проверить отображение в desktop, tablet и mobile-режимах.</li>
              <li>Во вкладке «Код» доступны сгенерированные html и css файлы.</li>
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

          <section className={styles.section}>
            <h2>Как называть слои для семантики</h2>
            <p>
              FrameForge анализирует не только типы узлов Figma, но и названия слоев. Если в имени есть понятные
              смысловые маркеры, сервис точнее выбирает HTML-теги, роли элементов и адаптивные паттерны.
            </p>
            <ul>
              <li>
                <strong>Кнопки:</strong> используйте слова <code>button</code>, <code>btn</code>, <code>cta</code> или
                имена вроде <code>primary-button</code>. Такие элементы могут быть преобразованы в <code>button</code>.
              </li>
              <li>
                <strong>Ссылки:</strong> называйте текстовые элементы и группы как <code>link</code>,&nbsp;
                <code>nav link</code>, <code>menu item</code>, <code>footer link</code>. Для них генератор может
                выбрать тег <code>a</code>.
              </li>
              <li>
                <strong>Навигация:</strong> для группы ссылок используйте <code>nav items</code>,&nbsp;
                <code>nav links</code>, <code>main nav</code> или <code>footer nav</code>. Это помогает распознать
                навигационный блок.
              </li>
              <li>
                <strong>Шапка:</strong> называйте верхний блок страницы <code>header</code>, <code>nav&nbsp;</code> или&nbsp;
                <code>menu</code>. Если внутри шапки есть логотип и группа навигации, генератор сможет подготовить
                адаптивное меню для узких экранов.
              </li>
              <li>
                <strong>Подвал:</strong> используйте <code>footer</code>, <code>footer bottom</code> или
                <code>&nbsp;footer header</code>. Такие блоки получают отдельные правила адаптивности.
              </li>
              <li>
                <strong>Hero-блок:</strong> называйте первый крупный экран <code>hero</code>, <code>banner</code> или
                <code>&nbsp;hero section</code>. Это помогает определить главный раздел страницы.
              </li>
              <li>
                <strong>Секции:</strong> для крупных смысловых областей используйте <code>section</code>,&nbsp;
                <code>main</code>, <code>call to action</code>, <code>cta</code>, <code>testimonial</code> или
                <code>&nbsp;quote</code>.
              </li>
              <li>
                <strong>Карточки:</strong> называйте повторяющиеся блоки <code>card</code>, <code>panel</code> или
                <code>&nbsp;content</code>. Если карточки стоят в ряд и имеют визуальную оболочку, они могут быть распознаны
                как карточная сетка.
              </li>
              <li>
                <strong>Списки:</strong> используйте <code>list</code>, <code>items</code>, <code>articles</code>,
                <code>&nbsp;item</code> или <code>article</code>. Это помогает отличить список и отдельные элементы списка.
              </li>
              <li>
                <strong>Медиа и иконки:</strong> называйте маленькие SVG/векторные элементы как <code>icon</code>,
                <code>&nbsp;arrow</code> или <code>bullet</code>. Картинки и векторные узлы могут быть преобразованы в
                <code>&nbsp;img</code>.
              </li>
              <li>
                <strong>Текст:</strong> для служебного мелкого текста подходят <code>caption</code> и
                <code>&nbsp;label</code>. Крупные текстовые элементы автоматически могут стать <code>h1</code> или
                <code>&nbsp;h2</code> по размеру шрифта.
              </li>
            </ul>
          </section>
        </div>
      </section>

      <SiteDisclaimer />
    </main>
  );
}
