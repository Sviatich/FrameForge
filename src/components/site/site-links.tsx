"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "./site-links.module.css";

type AuthSession = {
  connected: boolean;
  expiresAt: number | null;
  userId: string | null;
};

type SiteLinksProps = {
  className?: string;
};

export function SiteHeader({ className = "" }: SiteLinksProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className={`${styles.header} ${isMenuOpen ? styles.headerMenuOpen : ""} ${className}`.trim()}>
      <Link className={styles.brand} href="/" onClick={() => setIsMenuOpen(false)}>
        <Image
          className={styles.brandIcon}
          src="/frameforge-logo.svg"
          width={20}
          height={20}
          alt=""
          aria-hidden="true"
        />
        FrameForge
      </Link>
      <button
        className={styles.menuButton}
        type="button"
        aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"}
        aria-expanded={isMenuOpen}
        aria-controls="site-header-nav"
        onClick={() => setIsMenuOpen((current) => !current)}
      >
        <span className={styles.menuButtonLine} />
        <span className={styles.menuButtonLine} />
        <span className={styles.menuButtonLine} />
      </button>
      <div className={styles.navPanel} id="site-header-nav">
        <SiteNav onNavigate={() => setIsMenuOpen(false)} />
      </div>
    </header>
  );
}

export function SiteDisclaimer({ className = "" }: SiteLinksProps) {
  return (
    <div className={`${styles.disclaimer} ${className}`.trim()} aria-label="Legal information">
      <p>
        &copy; 2026 FrameForge. Этот продукт представляет собой независимый инструмент, использующий API Figma. Figma является товарным знаком компании Figma, Inc.
      </p>
    </div>
  );
}

export function SiteLinks({ className = "" }: SiteLinksProps) {
  return (
    <div className={`${styles.footer} ${className}`.trim()}>
      <SiteNav />
      <SiteDisclaimer />
    </div>
  );
}

function SiteNav({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const sessionQuery = useQuery<AuthSession>({
    queryKey: ["figma-session"],
    queryFn: async () => {
      const response = await fetch("/api/auth/figma/session", { cache: "no-store" });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message ?? "Failed to check Figma session.");
      }

      return json as AuthSession;
    },
    staleTime: 30_000,
  });

  async function handleLogout(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    onNavigate?.();

    await fetch("/api/auth/figma/logout", {
      method: "POST",
    });

    await queryClient.invalidateQueries({ queryKey: ["figma-session"] });

    if (pathname === "/") {
      router.refresh();
      return;
    }

    router.replace("/");
  }

  return (
    <nav className={styles.links} aria-label="Service navigation">
      <Link href="/privacy-policy" onClick={onNavigate}>
        Политика конфиденциальности
      </Link>
      <Link href="/about" onClick={onNavigate}>
        О проекте
      </Link>
      <Link href="/doc" onClick={onNavigate}>
        Инструкции
      </Link>
      <a href="https://github.com/Sviatich/FrameForge" target="_blank" rel="noreferrer" onClick={onNavigate}>
        GitHub
      </a>
      {sessionQuery.data?.connected ? (
        <a href="/api/auth/figma/logout" onClick={handleLogout}>
          <ReturnIcon />
          &nbsp;Сменить аккаунт
        </a>
      ) : null}
    </nav>
  );
}

function ReturnIcon() {
  return (
    <svg width="12px" viewBox="0 0 16 16" fill="none">
      <path
        d="M5 1H4L0 5L4 9H5V6H11C12.6569 6 14 7.34315 14 9C14 10.6569 12.6569 12 11 12H4V14H11C13.7614 14 16 11.7614 16 9C16 6.23858 13.7614 4 11 4H5V1Z"
        fill="var(--ink-soft)"
      />
    </svg>
  );
}
