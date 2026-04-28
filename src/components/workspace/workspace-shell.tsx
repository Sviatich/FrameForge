"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  loadFigmaResponseSchema,
  projectRecordSchema,
  transformProjectRequestSchema,
  type FigmaSourceDto,
  type ProjectRecord,
} from "@/lib/projects/schema";
import { SiteDisclaimer } from "@/components/site/site-links";
import styles from "./workspace-shell.module.css";

// Рабочая область проекта: preview, дерево файлов, просмотр кода и экспорт архива.
type WorkspaceShellProps = {
  projectId: string;
};

type ProjectFile = {
  path: string;
  content: string;
  language: string;
};

type FileTreeNode = {
  name: string;
  path: string;
  kind: "directory" | "file";
  file?: ProjectFile;
  children?: FileTreeNode[];
};

type PreviewMode = "full-width" | "desktop" | "tablet" | "mobile";

type WorkspaceSession = {
  figmaUrl: string;
  source: FigmaSourceDto;
  loadResult: {
    fileKey: string;
    fileName: string;
    mode: "live";
    suggestedNodeId?: string;
    frames: ProjectRecord["availableFrames"];
  };
  currentProject: ProjectRecord | null;
};

const WORKSPACE_SESSION_KEY = "transfig:workspace-session";

SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("html", markup);
SyntaxHighlighter.registerLanguage("markup", markup);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("bash", bash);

export function WorkspaceShell({ projectId }: WorkspaceShellProps) {
  const [activeView, setActiveView] = useState<"preview" | "code">("preview");
  const [selectedFilePath, setSelectedFilePath] = useState("");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("full-width");
  const [localSession, setLocalSession] = useState<WorkspaceSession | null>(null);
  const [localProject, setLocalProject] = useState<ProjectRecord | null>(null);
  const [isLocalSessionReady, setIsLocalSessionReady] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [renderingFrameId, setRenderingFrameId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const isLocalWorkspace = projectId === "local";

  useEffect(() => {
    if (!isLocalWorkspace) {
      setIsLocalSessionReady(true);
      return;
    }

    try {
      const raw = sessionStorage.getItem(WORKSPACE_SESSION_KEY);

      if (!raw) {
        setLocalSession(null);
        setLocalProject(null);
        return;
      }

      const parsed = JSON.parse(raw) as WorkspaceSession;
      const loadResult = loadFigmaResponseSchema.parse(parsed.loadResult);
      const currentProject = parsed.currentProject ? projectRecordSchema.parse(parsed.currentProject) : null;
      const nextSession = {
        figmaUrl: parsed.figmaUrl,
        source: parsed.source,
        loadResult,
        currentProject,
      };

      setLocalSession(nextSession);
      setLocalProject(currentProject);
    } catch {
      sessionStorage.removeItem(WORKSPACE_SESSION_KEY);
      setLocalSession(null);
      setLocalProject(null);
    } finally {
      setIsLocalSessionReady(true);
    }
  }, [isLocalWorkspace]);

  const project = localProject;
  const frames = localSession?.loadResult.frames ?? [];
  const files = useMemo(() => project?.files ?? [], [project?.files]);
  const selectedFrame = frames.find((frame) => frame.id === project?.selectedNodeId);

  // Сначала пытаемся оставить выбранный файл, затем переходим к entry-файлу проекта.
  const selectedFile = useMemo(() => {
    if (files.length === 0) {
      return undefined;
    }

    return (
      files.find((file) => file.path === selectedFilePath) ??
      files.find((file) => file.path === project?.entryFilePath) ??
      files[0]
    );
  }, [files, project?.entryFilePath, selectedFilePath]);

  const fileTree = useMemo(() => buildFileTree(files), [files]);
  const deferredFileContent = useDeferredValue(selectedFile?.content ?? "");
  const previewHtml = useMemo(() => {
    if (!project) {
      return "";
    }

    return previewMode === "full-width"
      ? injectFullWidthPreviewOverride(project.previewHtml, project.selectedNodeWidth ?? null)
      : project.previewHtml;
  }, [previewMode, project]);

  async function handleFrameSelect(frameId: string) {
    if (!localSession || renderingFrameId) {
      return;
    }

    try {
      setWorkspaceError("");
      setRenderingFrameId(frameId);

      const payload = transformProjectRequestSchema.parse({
        selectedNodeId: frameId,
        source: localSession.source,
      });
      const response = await fetch("/api/transform", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message ?? "Не удалось отрисовать выбранный frame.");
      }

      const parsedProject = projectRecordSchema.parse(json);
      const nextSession = {
        ...localSession,
        currentProject: parsedProject,
      };

      setLocalProject(parsedProject);
      setLocalSession(nextSession);
      setSelectedFilePath("");
      sessionStorage.setItem(WORKSPACE_SESSION_KEY, JSON.stringify(nextSession));
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Не удалось отрисовать выбранный frame.");
    } finally {
      setRenderingFrameId(null);
    }
  }

  async function handleDownload() {
    if (!project) {
      return;
    }

    try {
      setWorkspaceError("");
      setIsExporting(true);

      const response = await fetch("/api/export/local", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          projectName: project.name,
          files: project.files,
        }),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(json?.message ?? "Не удалось скачать ZIP-архив.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getDownloadName(response.headers.get("content-disposition"), project.name);
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Не удалось скачать ZIP-архив.");
    } finally {
      setIsExporting(false);
    }
  }

  if (!isLocalSessionReady) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <p>Загружаем рабочую область проекта.</p>
        </section>
      </main>
    );
  }

  if (!isLocalWorkspace) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <Notice message="Серверные проекты больше не используются. Вернитесь на главную и откройте макет заново." />
          <Link className={styles.primaryButton} href="/">
            Загрузить макет
          </Link>
        </section>
      </main>
    );
  }

  if (!localSession) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <Notice message="Рабочая сессия не найдена. Вернитесь на главную и загрузите Figma-макет заново." />
          <Link className={styles.primaryButton} href="/">
            Загрузить макет
          </Link>
        </section>
      </main>
    );
  }

  const workspaceTitle = project?.name ?? localSession?.loadResult.fileName ?? "Рабочая область";
  const workspaceMeta = project?.selectedNodeName ?? "Выберите frame в левом сайдбаре";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerActions}>
          <Link className={styles.backButton} href="/">
            <BackIcon />
          </Link>

          <div className={styles.projectTitleBlock}>
            <span className={styles.projectTitle}>{workspaceTitle}</span>
            <span className={styles.projectMeta}>{workspaceMeta}</span>
            {selectedFrame ? (
              <span
                className={`${styles.projectMeta} ${styles.projectStatus} ${
                  selectedFrame.hasAutoLayout ? styles.projectStatusReady : styles.projectStatusWarning
                }`}
              >
                {selectedFrame.hasAutoLayout ? <ReadyIcon /> : <WarningIcon />}
                <span>{selectedFrame.hasAutoLayout ? "Auto Layout используется" : "AutoLayout не используется"}</span>
              </span>
            ) : null}
            {false ? (
              <span className={`${styles.projectMeta} ${styles.projectWarning}`}>
                <WarningIcon />
                <span>Рекомендуем использовать Auto Layout</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className={styles.headerActions}>
          {activeView === "preview" ? (
            <div className={styles.previewDeviceSwitch}>
              <button
                type="button"
                className={`${styles.previewDeviceTab} ${previewMode === "full-width" ? styles.previewDeviceTabActive : ""}`}
                onClick={() => setPreviewMode("full-width")}
                aria-label="Full width preview"
                title="Full width"
              >
                <StretchIcon />
              </button>
              <button
                type="button"
                className={`${styles.previewDeviceTab} ${previewMode === "desktop" ? styles.previewDeviceTabActive : ""}`}
                onClick={() => setPreviewMode("desktop")}
                aria-label="Desktop preview"
                title="Desktop"
              >
                <DesktopIcon />
              </button>
              <button
                type="button"
                className={`${styles.previewDeviceTab} ${previewMode === "tablet" ? styles.previewDeviceTabActive : ""}`}
                onClick={() => setPreviewMode("tablet")}
                aria-label="Tablet preview"
                title="Tablet"
              >
                <TabletIcon />
              </button>
              <button
                type="button"
                className={`${styles.previewDeviceTab} ${previewMode === "mobile" ? styles.previewDeviceTabActive : ""}`}
                onClick={() => setPreviewMode("mobile")}
                aria-label="Mobile preview"
                title="Mobile"
              >
                <MobileIcon />
              </button>
            </div>
          ) : null}

          <div className={styles.switcher}>
            <button
              className={`${styles.switchTab} ${activeView === "preview" ? styles.switchTabActive : ""}`}
              type="button"
              onClick={() => setActiveView("preview")}
            >
              Превью
            </button>
            <button
              className={`${styles.switchTab} ${activeView === "code" ? styles.switchTabActive : ""}`}
              type="button"
              onClick={() => setActiveView("code")}
            >
              Код
            </button>
          </div>

          <button className={styles.primaryButton} type="button" onClick={handleDownload} disabled={!project || isExporting}>
            <DownloadIcon />
            <span>{isExporting ? "Собираем ZIP" : "Скачать код"}</span>
          </button>
        </div>
      </header>

      <section className={`${styles.surface} ${isSidebarCollapsed ? styles.surfaceSidebarCollapsed : ""}`}>
        <aside className={styles.frameSidebar}>
          <div className={styles.frameSidebarHeader}>
            <div className={styles.frameSidebarTitleBlock}>
              <span className={styles.frameSidebarTitle}>Список фреймов</span>
              <span className={styles.frameSidebarMeta}>{frames.length} доступно</span>
            </div>
            <button
              className={styles.sidebarToggle}
              type="button"
              onClick={() => setIsSidebarCollapsed((current) => !current)}
              aria-label={isSidebarCollapsed ? "Раскрыть список frame" : "Скрыть список frame"}
              title={isSidebarCollapsed ? "Раскрыть" : "Скрыть"}
            >
              <SidebarIcon />
            </button>
          </div>

          <div className={styles.framesList}>
            {frames.map((frame) => (
              <button
                key={frame.id}
                type="button"
                className={`${styles.frameItem} ${project?.selectedNodeId === frame.id ? styles.frameItemActive : ""} ${
                  renderingFrameId === frame.id ? styles.frameItemRendering : ""
                }`}
                onClick={() => handleFrameSelect(frame.id)}
                disabled={renderingFrameId !== null}
              >
                <span className={styles.frameItemText}>
                  <strong>{frame.name}</strong>
                  <span
                    className={`${styles.frameItemMeta} ${
                      frame.hasAutoLayout ? styles.frameItemMetaReady : styles.frameItemMetaWarning
                    }`}
                  >
                    {frame.hasAutoLayout ? <ReadyIcon /> : <WarningIcon />}
                    <span>{frame.hasAutoLayout ? "Auto Layout используется" : "AutoLayout не используется"}</span>
                  </span>
                </span>
                <span className={styles.frameItemAction}>
                  {renderingFrameId === frame.id ? <LoaderIcon /> : <ArrowRightIcon />}
                </span>
              </button>
            ))}
          </div>

          {workspaceError ? <Notice className={styles.sidebarNotice} message={workspaceError} /> : null}
        </aside>

        <div className={styles.workspacePane}>
          {activeView === "preview" ? (
            <div className={styles.previewShell}>
              <div className={styles.previewStage}>
                {project ? (
                  <div className={`${styles.previewViewport} ${styles[getPreviewViewportClassName(previewMode)]}`}>
                    {/* Preview изолирован в iframe, чтобы generated HTML жил в собственной среде. */}
                    <iframe className={styles.previewFrame} srcDoc={previewHtml} title={`Preview for ${workspaceTitle}`} />
                  </div>
                ) : (
                  <EmptyPreview message="Выберите необходимый frame в меню слева" />
                )}
              </div>
            </div>
          ) : project ? (
            <div className={styles.codeView}>
            <aside className={styles.fileExplorer}>
              <div className={styles.explorerHeader}>Файлы проекта</div>

              <div className={styles.fileTree}>
                {/* Файлы показываем не списком, а древовидной структурой, чтобы она была ближе к реальному проекту. */}
                {fileTree.map((node) => (
                  <FileTreeBranch
                    key={node.path}
                    node={node}
                    depth={0}
                    selectedFilePath={selectedFile?.path ?? ""}
                    onSelect={setSelectedFilePath}
                  />
                ))}
              </div>
            </aside>

            <section className={styles.codePane}>
              <div className={styles.codeToolbar}>
                <span className={styles.currentFile}>{selectedFile?.path ?? "Файл не выбран"}</span>
              </div>

              <CodeViewer
                content={deferredFileContent || "Файл не выбран."}
                language={getSyntaxLanguage(selectedFile?.language)}
              />
            </section>
          </div>
          ) : (
            <EmptyPreview message="Выберите необходимый frame в меню слева" />
          )}
        </div>
      </section>
      <SiteDisclaimer className={styles.workspaceDisclaimer} />
    </main>
  );
}

function Notice({ message, className = "" }: { message: string; className?: string }) {
  return (
    <div className={`${styles.notice} ${className}`.trim()} role="status">
      <WarningIcon />
      <p>{message}</p>
    </div>
  );
}

function EmptyPreview({ message }: { message: string }) {
  return (
    <div className={styles.emptyPreview}>
      <Image className={styles.emptyPreviewIcon} src="/logo-ff-empty.svg" width={72} height={72} alt="" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

type FileTreeBranchProps = {
  node: FileTreeNode;
  depth: number;
  selectedFilePath: string;
  onSelect: (path: string) => void;
};

function FileTreeBranch({ node, depth, selectedFilePath, onSelect }: FileTreeBranchProps) {
  if (node.kind === "directory") {
    return (
      <div className={styles.treeGroup}>
        {/* Сейчас директории всегда раскрыты: это упрощает просмотр небольшого generated-проекта. */}
        <div className={styles.treeFolder} style={{ paddingLeft: `${12 + depth * 16}px` }}>
          <span className={styles.treeChevron} aria-hidden="true">
            &#9662;
          </span>
          <span className={styles.treeFolderName}>{node.name}</span>
        </div>

        {node.children?.map((child) => (
          <FileTreeBranch
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedFilePath={selectedFilePath}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.treeFile} ${node.path === selectedFilePath ? styles.treeFileActive : ""}`}
      style={{ paddingLeft: `${34 + depth * 16}px` }}
      onClick={() => onSelect(node.path)}
    >
      <span className={styles.treeFileName}>{node.name}</span>
      <span className={styles.treeFileMeta}>{node.file?.language ?? ""}</span>
    </button>
  );
}

type CodeViewerProps = {
  content: string;
  language: string;
};

function CodeViewer({ content, language }: CodeViewerProps) {
  return (
    <div className={styles.codeBlock}>
      {/* Подсветка синтаксиса нужна только как viewer, без редактирования файлов внутри приложения. */}
      <SyntaxHighlighter
        language={language}
        style={oneLight}
        showLineNumbers
        wrapLongLines={false}
        customStyle={{
          margin: 0,
          padding: "24px",
          background: "transparent",
          fontSize: "0.9rem",
          lineHeight: "1.7",
        }}
        lineNumberStyle={{
          minWidth: "2.8em",
          paddingRight: "1.2em",
          color: "#8a94a8",
          userSelect: "none",
        }}
        codeTagProps={{
          style: {
            fontFamily: "var(--font-geist-mono, 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace)",
          },
        }}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.backIcon}>
      <path
        d="M5 12H19M5 12L11 6M5 12L11 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StretchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={styles.deviceIcon}>
      <path stroke="none" d="M0 0h24v24H0z" />
      <path d="M10 12h-7l3 -3m0 6l-3 -3" />
      <path d="M14 12h7l-3 -3m0 6l3 -3" />
      <path d="M3 6v-3h18v3" />
      <path d="M3 18v3h18v-3" />
    </svg>
  );
}

function DesktopIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.deviceIcon}>
      <rect x="4" y="4" width="16" height="12" rx="2" />
      <path d="M12 16V20" />
      <path d="M8 20H16" />
    </svg>
  );
}

function TabletIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.deviceIcon}>
      <path d="M19 12V11.988M4 19H20C21.1046 19 22 18.1046 22 17V7C22 5.89543 21.1046 5 20 5H4C2.89543 5 2 5.89543 2 7V17C2 18.1046 2.89543 19 4 19Z" />
    </svg>
  );
}

function MobileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.deviceIcon}>
      <path d="M12 18H12.01M9.2 21H14.8C15.9201 21 16.4802 21 16.908 20.782C17.2843 20.5903 17.5903 20.2843 17.782 19.908C18 19.4802 18 18.9201 18 17.8V6.2C18 5.0799 18 4.51984 17.782 4.09202C17.5903 3.71569 17.2843 3.40973 16.908 3.21799C16.4802 3 15.9201 3 14.8 3H9.2C8.0799 3 7.51984 3 7.09202 3.21799C6.71569 3.40973 6.40973 3.71569 6.21799 4.09202C6 4.51984 6 5.07989 6 6.2V17.8C6 18.9201 6 19.4802 6.21799 19.908C6.40973 20.2843 6.71569 20.5903 7.09202 20.782C7.51984 21 8.07989 21 9.2 21Z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.downloadIcon}>
      <path d="M3 12.3v7a2 2 0 0 0 2 2H19a2 2 0 0 0 2-2v-7" />
      <polyline points="7.9 12.3 12 16.3 16.1 12.3" />
      <line x1="12" x2="12" y1="2.7" y2="14.2" />
    </svg>
  );
}

function SidebarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.sidebarIcon}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4V20" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={styles.frameActionSvg}>
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
      className={`${styles.frameActionSvg} ${styles.loaderIcon}`}
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

function buildFileTree(files: ProjectFile[]) {
  const tree: FileTreeNode[] = [];

  // Разбиваем плоский список файлов на древовидную структуру по path-сегментам.
  for (const file of files) {
    const segments = file.path.split("/").filter(Boolean);
    insertFileNode(tree, segments, file, "");
  }

  return sortTreeNodes(tree);
}

function insertFileNode(nodes: FileTreeNode[], segments: string[], file: ProjectFile, currentPath: string) {
  const [segment, ...rest] = segments;
  const nodePath = currentPath ? `${currentPath}/${segment}` : segment;
  const isFile = rest.length === 0;

  if (isFile) {
    nodes.push({
      name: segment,
      path: nodePath,
      kind: "file",
      file,
    });

    return;
  }

  let directory = nodes.find((node) => node.kind === "directory" && node.name === segment);

  if (!directory) {
    // При первом проходе создаем промежуточные каталоги на лету.
    directory = {
      name: segment,
      path: nodePath,
      kind: "directory",
      children: [],
    };

    nodes.push(directory);
  }

  insertFileNode(directory.children ?? [], rest, file, nodePath);
}

function sortTreeNodes(nodes: FileTreeNode[]): FileTreeNode[] {
  // Сначала каталоги, потом файлы — как в обычном файловом менеджере.
  return [...nodes]
    .map((node) =>
      node.kind === "directory"
        ? {
            ...node,
            children: sortTreeNodes(node.children ?? []),
          }
        : node,
    )
    .sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === "directory" ? -1 : 1;
      }

      return left.name.localeCompare(right.name, "ru");
    });
}

function getSyntaxLanguage(language?: string) {
  // Приводим внутренние language-id к именам, понятным для Prism.
  switch (language) {
    case "tsx":
      return "tsx";
    case "ts":
    case "typescript":
      return "typescript";
    case "jsx":
      return "jsx";
    case "js":
    case "javascript":
      return "javascript";
    case "css":
      return "css";
    case "html":
      return "html";
    case "json":
      return "json";
    case "bash":
    case "sh":
      return "bash";
    default:
      return "typescript";
  }
}

function getPreviewViewportClassName(mode: PreviewMode) {
  // Один helper связывает режим предпросмотра с CSS-классами viewport.
  switch (mode) {
    case "full-width":
      return "previewViewportFullWidth";
    case "desktop":
      return "previewViewportDesktop";
    case "tablet":
      return "previewViewportTablet";
    case "mobile":
      return "previewViewportMobile";
    default:
      return "previewViewportDesktop";
  }
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={styles.warningIcon}>
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

function injectFullWidthPreviewOverride(html: string, frameWidth: number | null) {
  const processedHtml = frameWidth ? replaceFrameWidthCssValues(html, frameWidth) : html;
  const override = `
    <style>
      html,
      body {
        width: 100%;
        max-width: none;
      }

      html {
        height: 100%;
        overflow: hidden;
      }

      body {
        min-height: 100%;
        max-height: 100%;
        overflow-x: hidden;
        overflow-y: auto;
      }

      body > *:first-child {
        width: 100% !important;
        max-width: none !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }
    </style>
  `;

  if (processedHtml.includes("</head>")) {
    return processedHtml.replace("</head>", `${override}\n  </head>`);
  }

  return `${override}\n${processedHtml}`;
}

function replaceFrameWidthCssValues(html: string, frameWidth: number) {
  const roundedFrameWidth = Math.round(frameWidth);
  const frameWidthToken = `${roundedFrameWidth}px`;

  return html.replace(/<style>([\s\S]*?)<\/style>/, (_match, css: string) => {
    let nextCss = css;

    nextCss = nextCss.replaceAll(`width: ${frameWidthToken};`, "width: 100%;");
    nextCss = nextCss.replaceAll(`max-width: ${frameWidthToken};`, "max-width: none;");
    nextCss = nextCss.replaceAll(`min-width: ${frameWidthToken};`, "min-width: 0;");
    nextCss = nextCss.replaceAll(`width: min(100%, ${frameWidthToken});`, "width: 100%;");
    nextCss = nextCss.replaceAll(`width: min(100%, ${frameWidthToken})`, "width: 100%");

    return `<style>${nextCss}</style>`;
  });
}

function getDownloadName(contentDisposition: string | null, projectName: string) {
  const fallback = `${projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "generated-project"}.zip`;

  if (!contentDisposition) {
    return fallback;
  }

  const match = contentDisposition.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

function ReadyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={styles.warningIcon}>
      <path d="M12,2C6.5,2,2,6.5,2,12s4.5,10,10,10s10-4.5,10-10S17.5,2,12,2z M12,20c-4.5,0-8-3.5-8-8s3.5-8,8-8s8,3.5,8,8 S16.5,20,12,20z" fill="currentColor" />
      <polygon points="9.8,16.8 6.1,13.2 7.5,11.7 9.8,14 15.5,7.9 17,9.3" fill="currentColor" />
    </svg>
  );
}
