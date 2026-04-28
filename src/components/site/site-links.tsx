"use client";

import { type MouseEvent } from "react";
import Link from "next/link";
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

export function HomeLink({ className = "" }: SiteLinksProps) {
  return (
    <Link className={className} href="/" aria-label="На главную страницу" title="На главную">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M11.3103 1.77586C11.6966 1.40805 12.3034 1.40805 12.6897 1.77586L20.6897 9.39491L23.1897 11.7759C23.5896 12.1567 23.605 12.7897 23.2241 13.1897C22.8433 13.5896 22.2103 13.605 21.8103 13.2241L21 12.4524V20C21 21.1046 20.1046 22 19 22H14H10H5C3.89543 22 3 21.1046 3 20V12.4524L2.18966 13.2241C1.78972 13.605 1.15675 13.5896 0.775862 13.1897C0.394976 12.7897 0.410414 12.1567 0.810345 11.7759L3.31034 9.39491L11.3103 1.77586ZM5 10.5476V20H9V15C9 13.3431 10.3431 12 12 12C13.6569 12 15 13.3431 15 15V20H19V10.5476L12 3.88095L5 10.5476ZM13 20V15C13 14.4477 12.5523 14 12 14C11.4477 14 11 14.4477 11 15V20H13Z"
          fill="currentColor"
        />
      </svg>
      <span>На главную</span>
    </Link>
  );
}

export function SiteNav({ onNavigate }: { onNavigate?: () => void }) {
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
        Конфиденциальность
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
        fill="var(--ink)"
      />
    </svg>
  );
}
