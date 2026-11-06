import { app, ipcMain } from 'electron'
import { carpetaDatos, db } from './db'
import type { InfoApp, ProyectoResumen } from '../shared/types'

export function registrarIpc(): void {
  ipcMain.handle('proyectos:listar', (): ProyectoResumen[] => {
    return db()
      .prepare(
        `SELECT p.id,
                p.nombre,
                p.descripcion,
                p.objetivo,
                p.estado,
                p.creado_en      AS creadoEn,
                p.ultimo_avance  AS ultimoAvance,
                p.proximo_paso   AS proximoPaso,
                COUNT(t.id)                  AS tareasTotal,
                COALESCE(SUM(t.hecha), 0)    AS tareasHechas
           FROM proyecto p
           LEFT JOIN tarea t ON t.proyecto_id = p.id
          GROUP BY p.id
          ORDER BY p.orden, p.id`
      )
      .all() as ProyectoResumen[]
  })

  ipcMain.handle(
    'app:info',
    (): InfoApp => ({ version: app.getVersion(), rutaDatos: carpetaDatos() })
  )
}
