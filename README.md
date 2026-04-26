# FrameForge

FrameForge превращает выбранный Figma frame в статический HTML/CSS-проект с предпросмотром, просмотром кода и ZIP-экспортом.

## Текущий сценарий

1. Пользователь подключает Figma через OAuth.
2. На главной странице вводит ссылку на Figma-макет.
3. `/api/figma/load` загружает структуру файла и возвращает список доступных frames.
4. Клиент сохраняет рабочую сессию в `sessionStorage` и открывает `/projects/local`.
5. В рабочей области пользователь выбирает frame в левом сайдбаре.
6. `/api/transform` генерирует `ProjectRecord` для выбранного frame и возвращает его клиенту без сохранения на сервере.
7. Preview и код обновляются на лету при переключении frames.
8. `/api/export/local` собирает ZIP из текущих файлов, скачивает внешние изображения, кладёт их в `assets/` и заменяет ссылки на локальные пути.

Проекты больше не сохраняются в `.transfig-data/projects`; текущая рабочая область живёт только у клиента.

## Команды

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

## Основные директории

- `src/app` - страницы и API routes Next.js.
- `src/components/import` - главная форма загрузки Figma-ссылки.
- `src/components/workspace` - рабочая область: frame sidebar, preview, code viewer и экспорт.
- `src/components/site` - общий header/footer и информационные страницы.
- `src/lib/figma` - OAuth, клиент Figma API и маппинг frames.
- `src/lib/core` - parser, transformer, generator и exporter.
- `src/lib/projects` - схемы API и сервисы текущей генерации.
- `public` - используемые статические ассеты интерфейса.

## API

### `POST /api/figma/load`

Принимает Figma-ссылку, подставляет OAuth-токен из cookie-сессии и возвращает:

- `fileKey`
- `fileName`
- `suggestedNodeId`
- `frames`

### `POST /api/transform`

Принимает `selectedNodeId` и Figma source, запускает pipeline и возвращает `ProjectRecord`.

Результат не записывается на диск.

### `POST /api/export/local`

Принимает:

```json
{
  "projectName": "Project name",
  "files": []
}
```

Возвращает ZIP-архив. Внешние image URL из HTML/CSS скачиваются сервером и заменяются на локальные файлы в `assets/`.

### Figma OAuth

- `GET /api/auth/figma/start`
- `GET /api/auth/figma/callback`
- `GET /api/auth/figma/session`
- `POST /api/auth/figma/logout`

## Pipeline

`runTransformationPipeline()` связывает шаги:

1. `resolveFigmaFile()` загружает Figma JSON.
2. `findNodeById()` выбирает нужный frame.
3. `fetchFigmaAssetUrls()` получает URL изображений.
4. `parseFigmaNode()` нормализует Figma-узел.
5. `transformNode()` превращает узел в семантическое дерево.
6. `generateProjectArtifacts()` генерирует HTML/CSS и preview.

## Хранение данных

- OAuth-сессия хранится в cookie.
- Последняя введённая Figma-ссылка хранится в `sessionStorage`.
- Текущая рабочая сессия хранится в `sessionStorage` под ключом `transfig:workspace-session`.
- Сгенерированные проекты не сохраняются на сервере.
