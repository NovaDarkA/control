import Database from 'better-sqlite3'
import { app } from 'electron'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { MIGRACIONES } from './migrations'
import { sembrarProyectos } from './seed'

let conexion: Database.Database | null = null

export function carpetaDatos(): string {
  return app.getPath('userData')
}

export function db(): Database.Database {
  if (!conexion) throw new Error('La base de datos no está abierta.')
  return conexion
}

export function abrirBaseDeDatos(): Database.Database {
  const carpeta = carpetaDatos()
  mkdirSync(carpeta, { recursive: true })
  const ruta = join(carpeta, 'project-control.db')
  const existia = existsSync(ruta)

  const d = new Database(ruta)
  d.pragma('journal_mode = WAL') // resiste cierres inesperados
  d.pragma('synchronous = FULL') // prioriza no perder datos sobre velocidad
  d.pragma('foreign_keys = ON')

  migrar(d, carpeta, existia)
  sembrarProyectos(d)
  conexion = d
  return d
}

function migrar(d: Database.Database, carpeta: string, existia: boolean): void {
  const actual = d.pragma('user_version', { simple: true }) as number
  if (actual > MIGRACIONES.length) {
    throw new Error(
      'Los datos fueron creados por una versión más nueva de Project Control. ' +
        'Instala la versión más reciente para abrirlos.'
    )
  }
  if (actual === MIGRACIONES.length) return

  // Antes de actualizar el esquema de datos existentes, se guarda una copia.
  if (existia && actual > 0) {
    d.pragma('wal_checkpoint(TRUNCATE)')
    const destino = join(carpeta, 'backups-automaticos')
    mkdirSync(destino, { recursive: true })
    const sello = new Date().toISOString().replace(/[:.]/g, '-')
    copyFileSync(
      join(carpeta, 'project-control.db'),
      join(destino, `antes-de-migrar-v${actual}-${sello}.db`)
    )
  }

  for (let i = actual; i < MIGRACIONES.length; i++) {
    d.transaction(() => {
      d.exec(MIGRACIONES[i])
      d.pragma(`user_version = ${i + 1}`)
    })()
  }
}

export function cerrarBaseDeDatos(): void {
  if (conexion) {
    conexion.pragma('wal_checkpoint(TRUNCATE)')
    conexion.close()
    conexion = null
  }
}
