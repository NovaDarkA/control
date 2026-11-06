# Project Control V1: Fase 1 (esqueleto)

Incluye: aplicación Electron + TypeScript + React, base de datos SQLite con el esquema completo,
migraciones versionadas, los 8 proyectos precargados (estado "Por iniciar", sin datos inventados),
Panel básico de solo lectura y el flujo de compilación del instalador en GitHub Actions.

No incluye aún (fases siguientes): sesiones, tareas editables, historial, respaldos.

## Compilar el instalador .exe (sin instalar nada en tu PC)
1. Crea un repositorio **privado** en GitHub y sube el contenido de esta carpeta.
2. En GitHub: pestaña **Actions** → "Compilar instalador de Windows" → **Run workflow**.
3. Al terminar, descarga el artefacto **ProjectControl-Setup** (contiene el `.exe`).
4. Ejecuta el instalador. Prueba: abrir desde el escritorio y desde el menú Inicio.

Los datos se guardan en `%APPDATA%\ProjectControl`. Desinstalar no los borra.

## Desarrollo local (opcional)
`npm install` → `npm run dev`
