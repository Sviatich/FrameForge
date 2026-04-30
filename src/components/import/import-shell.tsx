"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ZodError } from "zod";
import { SiteDisclaimer, SiteNav } from "@/components/site/site-links";
import {
  loadFigmaRequestSchema,
  loadFigmaResponseSchema,
  type FigmaSourceDto,
} from "@/lib/projects/schema";
import styles from "./import-shell.module.css";

type AuthSession = {
  connected: boolean;
  expiresAt: number | null;
  userId: string | null;
};

type ImportShellProps = {
  figmaState?: string;
  figmaReason?: string;
};

type PersistedImportState = {
  figmaUrl: string;
};

const STORAGE_KEY = "transfig:last-import";
const WORKSPACE_SESSION_KEY = "transfig:workspace-session";

export function ImportShell({ figmaState, figmaReason }: ImportShellProps) {
  const router = useRouter();
  const [figmaUrl, setFigmaUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoadingFrames, setIsLoadingFrames] = useState(false);
  const [storageReady, setStorageReady] = useState(false);

  const sessionQuery = useQuery<AuthSession>({
    queryKey: ["figma-session"],
    queryFn: async () => {
      const response = await fetch("/api/auth/figma/session", { cache: "no-store" });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message ?? "Не удалось проверить OAuth-сессию Figma.");
      }

      return json as AuthSession;
    },
  });

  useEffect(() => {
    // Восстанавливаем незавершенный сценарий импорта после обычной навигации внутри приложения.
    try {
      const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;

      if (navigationEntry?.type === "reload") {
        sessionStorage.removeItem(STORAGE_KEY);
        setStorageReady(true);
        return;
      }

      const raw = sessionStorage.getItem(STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw) as PersistedImportState;
        setFigmaUrl(parsed.figmaUrl ?? "");
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    // Реагируем на возврат из OAuth callback и показываем человеку понятный статус.
    if (figmaState === "connected") {
      setError("");
      sessionQuery.refetch();
    }

    if (figmaState === "error") {
      setError(
        figmaReason
          ? `Не удалось завершить подключение Figma: ${figmaReason}`
          : "Не удалось завершить подключение Figma.",
      );
    }
  }, [figmaReason, figmaState, sessionQuery]);

  useEffect(() => {
    // Если сессия оборвалась, сбрасываем локальное состояние, связанное с текущим макетом.
    if (sessionQuery.data && !sessionQuery.data.connected) {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(WORKSPACE_SESSION_KEY);
    }
  }, [sessionQuery.data]);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    // Сохраняем ссылку и результат загрузки во временное хранилище браузера.
    const payload: PersistedImportState = {
      figmaUrl,
    };

    if (figmaUrl.trim()) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }
  }, [figmaUrl, storageReady]);

  async function handleLoad() {
    try {
      setError("");
      setIsLoadingFrames(true);

      const source = buildSourcePayload();
      const payload = loadFigmaRequestSchema.parse({ source });
      const response = await fetch("/api/figma/load", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message ?? "Не удалось загрузить файл Figma.");
      }

      const parsed = loadFigmaResponseSchema.parse(json);
      sessionStorage.setItem(
        WORKSPACE_SESSION_KEY,
        JSON.stringify({
          figmaUrl,
          source,
          loadResult: parsed,
          currentProject: null,
        }),
      );
      router.push("/projects/local");
    } catch (caughtError) {
      setError(formatError(caughtError));
    } finally {
      setIsLoadingFrames(false);
    }
  }

  function buildSourcePayload(): FigmaSourceDto {
    // Токен не храним на клиенте: сервер сам подставит его из cookie OAuth-сессии.
    return {
      kind: "figma-link",
      url: figmaUrl,
      accessToken: "",
    };
  }

  const isConnected = Boolean(sessionQuery.data?.connected);

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.intro}>
          <Image
            className={styles.homeLogo}
            src="/frameforge-logo.svg"
            width={56}
            height={56}
            alt="FrameForge"
            priority
          />
          <h1 className={styles.title}>
            Превращаем <span className={styles.titleAccent}>Figma</span><br /> макет в веб-верстку
          </h1>
          <p className={styles.description}>
            Выпускная квалификационная работа Петрина Святослава Андреевича
          </p>
        </header>

        {!isConnected ? (
          <section className={`${styles.panel} ${styles.authCard}`}>
            <div className={styles.authHeader}>
              <div>
                <p className={styles.hint}>Авторизуйтесь с помощью вашего аккаунта Figma</p>
              </div>

              <div className={styles.toolbarRight}>
                <a className={styles.primaryButton} href="/api/auth/figma/start">
                  <span>Подключить</span>
                  <FigmaIcon />
                </a>
              </div>
            </div>
          </section>
        ) : (
          <section className={styles.panel}>
            <div className={styles.linkRow}>
              <input
                className={styles.linkInput}
                placeholder="Вставьте ссылку на Figma-макет"
                value={figmaUrl}
                onChange={(event) => setFigmaUrl(event.target.value)}
                disabled={isLoadingFrames}
              />
              <button
                className={styles.primaryButton}
                type="button"
                onClick={handleLoad}
                disabled={!figmaUrl.trim() || isLoadingFrames}
              >
                <span>Загрузить</span>
                {isLoadingFrames ? <LoaderIcon /> : <ArrowRightIcon />}
              </button>
            </div>

            {error ? <Notice message={error} /> : null}
          </section>
        )}
        <div className={styles.inlineNav}>
          <SiteNav />
        </div>
      </section>
      <SiteDisclaimer />
    </main>
  );
}

function Notice({ message }: { message: string }) {
  return (
    <div className={styles.notice} role="status">
      <WarningIcon />
      <p>{message}</p>
    </div>
  );
}

function formatError(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Ошибка валидации запроса.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Неизвестная ошибка.";
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={styles.noticeIcon}>
      <path
        d="M12 15H12.01M12 12V9M4.98207 19H19.0179C20.5615 19 21.5233 17.3256 20.7455 15.9923L13.7276 3.96153C12.9558 2.63852 11.0442 2.63852 10.2724 3.96153L3.25452 15.9923C2.47675 17.3256 3.43849 19 4.98207 19Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FigmaIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={styles.figmaIcon}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 16C16 13.7909 17.7909 12 20 12C22.2091 12 24 13.7909 24 16C24 18.2091 22.2091 20 20 20C17.7909 20 16 18.2091 16 16Z"
        fill="#1ABCFE"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 24C8 21.7909 9.79086 20 12 20H16V24C16 26.2091 14.2091 28 12 28C9.79086 28 8 26.2091 8 24Z"
        fill="#0ACF83"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 4V12H20C22.2091 12 24 10.2091 24 8C24 5.79086 22.2091 4 20 4H16Z"
        fill="#FF7262"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 8C8 10.2091 9.79086 12 12 12H16V4H12C9.79086 4 8 5.79086 8 8Z"
        fill="#F24E1E"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 16C8 18.2091 9.79086 20 12 20H16V12H12C9.79086 12 8 13.7909 8 16Z"
        fill="#A259FF"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={styles.buttonIcon}>
      <path
        d="M6 12H18M18 12L13 7M18 12L13 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoaderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`${styles.buttonIcon} ${styles.loaderIcon}`}
    >
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}

