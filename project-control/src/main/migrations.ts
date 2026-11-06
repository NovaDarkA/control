/**
 * Migraciones de la base de datos. Reglas:
 *  - Nunca editar una migración ya publicada; añadir una nueva al final.
 *  - La versión de esquema se guarda en PRAGMA user_version.
 *
 * Modelo (documento maestro, fase 3):
 *  - El tiempo (efectivo, pausas, interrupciones) NO se guarda como contador:
 *    se deriva de evento_sesion, para que no pueda desincronizarse.
 *  - sesion.ultimo_latido permite la recuperación tras un cierre inesperado.
 *  - evento_sesion 'sin_actividad' registra el intervalo con la app cerrada
 *    (desde_en → hasta_en); nunca cuenta como tiempo efectivo.
 *  - sesion.abierta + índice único garantiza una sola sesión activa o pausada.
 */
export const MIGRACIONES: string[] = [
  `
  CREATE TABLE proyecto (
    id            INTEGER PRIMARY KEY,
    nombre        TEXT NOT NULL UNIQUE,
    descripcion   TEXT NOT NULL DEFAULT '',
    objetivo      TEXT NOT NULL DEFAULT '',
    estado        TEXT NOT NULL DEFAULT 'por_iniciar'
                  CHECK (estado IN ('por_iniciar','en_progreso','en_pausa','bloqueado','completado')),
    creado_en     TEXT NOT NULL,
    ultimo_avance TEXT,
    proximo_paso  TEXT,
    orden         INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE hito (
    id          INTEGER PRIMARY KEY,
    proyecto_id INTEGER NOT NULL REFERENCES proyecto(id) ON DELETE CASCADE,
    titulo      TEXT NOT NULL,
    creado_en   TEXT NOT NULL
  );

  CREATE TABLE tarea (
    id            INTEGER PRIMARY KEY,
    proyecto_id   INTEGER NOT NULL REFERENCES proyecto(id) ON DELETE CASCADE,
    hito_id       INTEGER REFERENCES hito(id) ON DELETE SET NULL,
    titulo        TEXT NOT NULL,
    hecha         INTEGER NOT NULL DEFAULT 0 CHECK (hecha IN (0,1)),
    completada_en TEXT,
    creado_en     TEXT NOT NULL
  );
  CREATE INDEX ix_tarea_proyecto ON tarea(proyecto_id);

  CREATE TABLE sesion (
    id                    TEXT PRIMARY KEY,
    proyecto_id           INTEGER NOT NULL REFERENCES proyecto(id),
    motivo                TEXT NOT NULL,
    objetivo              TEXT NOT NULL,
    prioridad             TEXT NOT NULL CHECK (prioridad IN ('alta','media','baja')),
    estado                TEXT NOT NULL CHECK (estado IN ('activa','pausada','cerrada')),
    abierta               INTEGER CHECK (abierta = 1),
    inicio_en             TEXT NOT NULL,
    cierre_en             TEXT,
    ultimo_latido         TEXT NOT NULL,
    actividades_completadas TEXT,
    resultados            TEXT,
    decisiones            TEXT,
    problemas_pendientes  TEXT,
    tareas_sin_terminar   TEXT,
    siguiente_paso        TEXT,
    CHECK ((estado = 'cerrada' AND abierta IS NULL AND cierre_en IS NOT NULL)
        OR (estado <> 'cerrada' AND abierta IS 1 AND cierre_en IS NULL))
  );
  -- NULL se considera distinto en índices únicos: solo puede haber UNA sesión abierta.
  CREATE UNIQUE INDEX ux_sesion_abierta ON sesion(abierta);
  CREATE INDEX ix_sesion_proyecto ON sesion(proyecto_id, inicio_en);

  CREATE TABLE evento_sesion (
    id        INTEGER PRIMARY KEY,
    sesion_id TEXT NOT NULL REFERENCES sesion(id) ON DELETE CASCADE,
    tipo      TEXT NOT NULL CHECK (tipo IN (
                'actividad','avance','resultado_parcial','decision','problema',
                'interrupcion','pausa','reanudacion','sin_actividad')),
    texto     TEXT NOT NULL DEFAULT '',
    creado_en TEXT NOT NULL,
    hasta_en  TEXT  -- solo para 'sin_actividad': fin del intervalo
  );
  CREATE INDEX ix_evento_sesion ON evento_sesion(sesion_id, creado_en);

  CREATE TABLE meta (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  );
  `
]
