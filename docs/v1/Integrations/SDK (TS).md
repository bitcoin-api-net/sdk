# TypeScript SDK

- Добавить `"packages/*"` в массив `workspaces` корневого `package.json`
- Создать директорию `packages/sdk`
- Создать файл `packages/sdk/package.json` с именем `@bitcoinapi/sdk` и начальной версией
- Установить `openapi-fetch` как dependency в `packages/sdk`
- Установить `openapi-typescript` и `typescript` как devDependencies в `packages/sdk`
- Создать файл `packages/sdk/tsconfig.json` с настройками для публикации ESM библиотеки (согласно правилам `backend.mdc`)
- Добавить скрипт `generate:types` в `packages/sdk/package.json`, вызывающий `openapi-typescript ../../apps/api/files/openapi.json -o ./src/schema.d.ts`
- Запустить генерацию типов `schema.d.ts`
- Создать файл `packages/sdk/src/index.ts`
- Реализовать функцию `createBitcoinClient` в `index.ts` поверх `openapi-fetch`, используя типы `paths` из сгенерированной схемы
- Реализовать поддержку опций `baseUrl` и `apiKey` в параметрах функции инициализации клиента
- Реализовать автоматическую подстановку заголовка `Authorization: Bearer <apiKey>` в запросах внутри клиента
- Настроить скрипт `build` в `packages/sdk/package.json` для компиляции TypeScript через стандартный `tsc`
- Прописать поля `files`, `exports`, `types` в `packages/sdk/package.json` для корректного использования при установке через npm
- Обновить корневой `Makefile` для поддержки сборки и публикации SDK (с использованием правил `makefile.mdc`)