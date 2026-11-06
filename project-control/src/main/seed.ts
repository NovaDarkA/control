import type Database from 'better-sqlite3'

/** Los ocho proyectos iniciales. Sin porcentajes, tareas ni fechas inventadas. */
export const PROYECTOS_INICIALES = [
  'Zapatería',
  'Kronos',
  'Obsidian',
  'Facturación electrónica',
  'Comparador de proveedores',
  'Cinemática de Twins Game Interactive',
  'Mizuki-P1',
  'Modpack'
]

/** Se ejecuta una sola vez (marca en meta), para no recrear proyectos en el futuro. */
export function sembrarProyectos(db: Database.Database): void {
  const ya = db.prepare("SELECT 1 FROM meta WHERE clave = 'seed_proyectos_v1'").get()
  if (ya) return
  const ahora = new Date().toISOString()
  const insertar = db.prepare(
    'INSERT OR IGNORE INTO proyecto (nombre, creado_en, orden) VALUES (?, ?, ?)'
  )
  db.transaction(() => {
    PROYECTOS_INICIALES.forEach((nombre, i) => insertar.run(nombre, ahora, i + 1))
    db.prepare("INSERT INTO meta (clave, valor) VALUES ('seed_proyectos_v1', ?)").run(ahora)
  })()
}
