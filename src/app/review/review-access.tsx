"use client";

import { useEffect, useState } from "react";
import styles from "./review.module.css";

type ReviewGuideProps = {
  figmaUrl: string;
  login: string;
  password: string;
  serviceUrl: string;
};

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
  }

  return (
    <button className={styles.copyButton} type="button" onClick={copy} disabled={!value} aria-label={`Скопировать ${label}`}>
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? "Скопировано" : "Скопировать"}
    </button>
  );
}

export function ReviewGuide({ figmaUrl, login, password, serviceUrl }: ReviewGuideProps) {
  const configured = Boolean(figmaUrl && login && password);

  return (
    <div className={styles.guide}>
      {!configured ? (
        <div className={styles.setupNotice} role="status">
          Для публикации заполните REVIEW_FIGMA_URL, REVIEW_FIGMA_LOGIN и REVIEW_FIGMA_PASSWORD.
        </div>
      ) : null}

      <section className={styles.step}>
        <div className={styles.stepNumber}>1</div>
        <div className={styles.stepContent}>
          <h2>Авторизуйтесь через Figma</h2>
          <p className={styles.description}>
            Для проверки работы приложения понадобится авторизоваться в сервисе через аккаунт Figma. Вы можете использовать свой аккаунт или войти в заранее подготовленный тестовый аккаунт.
          </p>
          <div className={styles.fields}>
            <ValueField label="Логин тестового аккаунта" value={login} fallback="Логин не указан" />
            <ValueField label="Пароль" value={password} fallback="Пароль не указан" />
          </div>
        </div>
      </section>

      <section className={styles.step}>
        <div className={styles.stepNumber}>2</div>
        <div className={styles.stepContent}>
          <h2>Подготовьте дизайн-макет</h2>
          <p className={styles.description}>
            Вы можете проверить сервис на собственном макете в Figma. Если подходящего макета нет, воспользуйтесь тестовым - он уже подготовлен для демонстрации.
          </p>
          <div className={styles.linkBox}>
            <div>
              <span>Тестовый макет</span>
              <strong>{figmaUrl ? "Демонстрация работы FrameForge" : "Ссылка не указана"}</strong>
            </div>
            <div className={styles.linkActions}>
              <CopyButton label="ссылку на макет" value={figmaUrl} />
              <ExternalLink href={figmaUrl}>Открыть макет</ExternalLink>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.step} ${styles.lastStep}`}>
        <div className={styles.stepNumber}>3</div>
        <div className={styles.stepContent}>
          <h2>Перейдите в приложение</h2>
          <p className={styles.description}>
            Откройте веб-сервис в новой вкладке и следуйте подсказкам на экране. Эта инструкция останется открытой, поэтому к ней можно вернуться и снова скопировать необходимые данные.
          </p>
          <ExternalLink href={serviceUrl} primary>На главную страницу</ExternalLink>
        </div>
      </section>
    </div>
  );
}

function ValueField({ label, value, fallback }: { label: string; value: string; fallback: string }) {
  return (
    <div className={styles.field}>
      <div>
        <span>{label}</span>
        <strong>{value || fallback}</strong>
      </div>
      <CopyButton label={label.toLowerCase()} value={value} />
    </div>
  );
}

function ExternalLink({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <a
      className={primary ? styles.primaryLink : styles.secondaryLink}
      href={href || undefined}
      target="_blank"
      rel="noreferrer"
      aria-disabled={!href}
    >
      {children} <ArrowIcon />
    </a>
  );
}

function CopyIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6.5" y="6.5" width="9" height="9" rx="2"/><path d="M13.5 6.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m3.5 10.5 4 4 9-9"/></svg>;
}

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M11 5l5 5-5 5"/></svg>;
}
