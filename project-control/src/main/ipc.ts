import { app, dialog, ipcMain } from 'electron'
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { carpetaDatos, db } from './db'
import type { InfoApp, ProyectoResumen, SesionCierre } from '../shared/types'

const ahora=()=>new Date().toISOString()
function sesionAbierta(){
  return db().prepare(`SELECT s.*,p.nombre AS proyectoNombre FROM sesion s JOIN proyecto p ON p.id=s.proyecto_id WHERE s.abierta=1 LIMIT 1`).get() as any
}
function tiempoEfectivo(s:any):number {
  const fin=s.cierre_en ? new Date(s.cierre_en).getTime() : Date.now()
  let total=Math.max(0,fin-new Date(s.inicio_en).getTime())
  const pausas=db().prepare(`SELECT creado_en,tipo FROM evento_sesion WHERE sesion_id=? AND tipo IN ('pausa','reanudacion','sin_actividad') ORDER BY creado_en,id`).all(s.id) as any[]
  let pausaDesde:number|null=null
  for(const e of pausas){
    const t=new Date(e.creado_en).getTime()
    if(e.tipo==='pausa' && pausaDesde===null) pausaDesde=t
    if(e.tipo==='reanudacion' && pausaDesde!==null){ total-=Math.max(0,t-pausaDesde); pausaDesde=null }
    if(e.tipo==='sin_actividad') total-=Math.max(0,new Date(e.hasta_en??e.creado_en).getTime()-t)
  }
  if(pausaDesde!==null) total-=Math.max(0,fin-pausaDesde)
  return Math.max(0,Math.floor(total/1000))
}
function exigirSesion(){const s=sesionAbierta();if(!s)throw new Error('No hay una sesión abierta.');return s}
function texto(v:unknown,campo:string,obligatorio=true):string {
  if(typeof v!=='string'||(obligatorio&&!v.trim())) throw new Error(campo+' es obligatorio.')
  return typeof v==='string'?v.trim():''
}
export function registrarIpc():void {
  ipcMain.handle('proyectos:listar',():ProyectoResumen[]=>db().prepare(`SELECT p.id,p.nombre,p.descripcion,p.objetivo,p.estado,p.creado_en AS creadoEn,p.ultimo_avance AS ultimoAvance,p.proximo_paso AS proximoPaso,COUNT(t.id) AS tareasTotal,COALESCE(SUM(t.hecha),0) AS tareasHechas FROM proyecto p LEFT JOIN tarea t ON t.proyecto_id=p.id GROUP BY p.id ORDER BY p.orden,p.id`).all() as ProyectoResumen[])
  ipcMain.handle('app:info',():InfoApp=>({version:app.getVersion(),rutaDatos:carpetaDatos()}))
  ipcMain.handle('proyectos:actualizar',(_e,d)=>{
    const nombre=texto(d.nombre,'Nombre'), descripcion=texto(d.descripcion??'','Descripción',false), objetivo=texto(d.objetivo??'','Objetivo',false), paso=texto(d.proximoPaso??'','Próximo paso',false)
    if(!['por_iniciar','en_progreso','en_pausa','bloqueado','completado'].includes(d.estado))throw new Error('Estado no válido.')
    db().prepare('UPDATE proyecto SET nombre=?,descripcion=?,objetivo=?,estado=?,proximo_paso=? WHERE id=?').run(nombre,descripcion,objetivo,d.estado,paso||null,d.id)
  })
  ipcMain.handle('tareas:listar',(_e,id)=>db().prepare('SELECT id,proyecto_id AS proyectoId,titulo,hecha,creado_en AS creadoEn FROM tarea WHERE proyecto_id=? ORDER BY id DESC').all(id).map((x:any)=>({...x,hecha:Boolean(x.hecha)})))
  ipcMain.handle('tareas:agregar',(_e,d)=>{const titulo=texto(d.titulo,'Título de tarea');db().prepare('INSERT INTO tarea(proyecto_id,titulo,creado_en) VALUES(?,?,?)').run(d.proyectoId,titulo,ahora())})
  ipcMain.handle('tareas:cambiar',(_e,d)=>db().prepare('UPDATE tarea SET hecha=?,completada_en=? WHERE id=?').run(d.hecha?1:0,d.hecha?ahora():null,d.id))
  ipcMain.handle('tareas:eliminar',(_e,id)=>db().prepare('DELETE FROM tarea WHERE id=?').run(id))
  ipcMain.handle('sesion:actual',()=>{const s=sesionAbierta();return s?{id:s.id,proyectoId:s.proyecto_id,proyectoNombre:s.proyectoNombre,motivo:s.motivo,objetivo:s.objetivo,prioridad:s.prioridad,estado:s.estado,inicioEn:s.inicio_en,cierreEn:s.cierre_en,siguientePaso:s.siguiente_paso,tiempoEfectivo:tiempoEfectivo(s)}:null})
  ipcMain.handle('sesion:iniciar',(_e,d)=>{
    if(sesionAbierta())throw new Error('Ya existe una sesión activa o pausada.')
    const motivo=texto(d.motivo,'Motivo'),objetivo=texto(d.objetivo,'Objetivo')
    if(!['alta','media','baja'].includes(d.prioridad))throw new Error('Prioridad no válida.')
    const id=randomUUID(),t=ahora()
    db().transaction(()=>{db().prepare(`INSERT INTO sesion(id,proyecto_id,motivo,objetivo,prioridad,estado,abierta,inicio_en,ultimo_latido) VALUES(?,?,?,?,?,'activa',1,?,?)`).run(id,d.proyectoId,motivo,objetivo,d.prioridad,t,t);db().prepare('UPDATE proyecto SET estado=\'en_progreso\' WHERE id=? AND estado=\'por_iniciar\'').run(d.proyectoId);db().prepare(`INSERT INTO evento_sesion(sesion_id,tipo,texto,creado_en) VALUES(?,'actividad','Sesión iniciada',?)`).run(id,t)})()
  })
  ipcMain.handle('sesion:evento',(_e,d)=>{const s=exigirSesion();const t=texto(d.texto,'Descripción');if(!['actividad','avance','resultado_parcial','decision','problema','interrupcion'].includes(d.tipo))throw new Error('Tipo de evento no válido.');db().transaction(()=>{db().prepare('INSERT INTO evento_sesion(sesion_id,tipo,texto,creado_en) VALUES(?,?,?,?)').run(s.id,d.tipo,t,ahora());db().prepare('UPDATE sesion SET ultimo_latido=? WHERE id=?').run(ahora(),s.id);if(d.tipo==='avance')db().prepare('UPDATE proyecto SET ultimo_avance=? WHERE id=?').run(t,s.proyecto_id)})()})
  ipcMain.handle('sesion:pausar',()=>{const s=exigirSesion();if(s.estado!=='activa')throw new Error('La sesión no está activa.');const t=ahora();db().transaction(()=>{db().prepare("INSERT INTO evento_sesion(sesion_id,tipo,texto,creado_en) VALUES(?,'pausa','Sesión pausada',?)").run(s.id,t);db().prepare("UPDATE sesion SET estado='pausada',ultimo_latido=? WHERE id=?").run(t,s.id)})()})
  ipcMain.handle('sesion:reanudar',()=>{const s=exigirSesion();if(s.estado!=='pausada')throw new Error('La sesión no está pausada.');const t=ahora();db().transaction(()=>{db().prepare("INSERT INTO evento_sesion(sesion_id,tipo,texto,creado_en) VALUES(?,'reanudacion','Sesión reanudada',?)").run(s.id,t);db().prepare("UPDATE sesion SET estado='activa',ultimo_latido=? WHERE id=?").run(t,s.id)})()})
  ipcMain.handle('sesion:latido',()=>{const s=sesionAbierta();if(s&&s.estado==='activa')db().prepare('UPDATE sesion SET ultimo_latido=? WHERE id=?').run(ahora(),s.id)})
  ipcMain.handle('sesion:cerrar',(_e,d:SesionCierre)=>{const s=exigirSesion();const t=ahora();db().transaction(()=>{db().prepare(`UPDATE sesion SET estado='cerrada',abierta=NULL,cierre_en=?,ultimo_latido=?,actividades_completadas=?,resultados=?,decisiones=?,problemas_pendientes=?,tareas_sin_terminar=?,siguiente_paso=? WHERE id=?`).run(t,t,texto(d.actividadesCompletadas,'Actividades completadas',false),texto(d.resultados,'Resultados',false),texto(d.decisiones,'Decisiones',false),texto(d.problemasPendientes,'Problemas',false),texto(d.tareasSinTerminar,'Tareas pendientes',false),texto(d.siguientePaso,'Próximo paso'),s.id);db().prepare("INSERT INTO evento_sesion(sesion_id,tipo,texto,creado_en) VALUES(?,'avance',?,?)").run(s.id,'Sesión cerrada. '+(d.siguientePaso||''),t);db().prepare('UPDATE proyecto SET ultimo_avance=?,proximo_paso=? WHERE id=?').run(d.resultados||d.actividadesCompletadas||'Sesión finalizada',d.siguientePaso,s.proyecto_id)})()})
  ipcMain.handle('historial:listar',(_e,id?:number)=>{const rows=db().prepare(`SELECT s.*,p.nombre AS proyectoNombre FROM sesion s JOIN proyecto p ON p.id=s.proyecto_id WHERE s.estado='cerrada' AND (? IS NULL OR s.proyecto_id=?) ORDER BY s.inicio_en DESC`).all(id??null,id??null) as any[];return rows.map(s=>({id:s.id,proyectoId:s.proyecto_id,proyectoNombre:s.proyectoNombre,motivo:s.motivo,objetivo:s.objetivo,prioridad:s.prioridad,estado:s.estado,inicioEn:s.inicio_en,cierreEn:s.cierre_en,siguientePaso:s.siguiente_paso,tiempoEfectivo:tiempoEfectivo(s),resultados:s.resultados,actividadesCompletadas:s.actividades_completadas}))})
  ipcMain.handle('historial:eventos',(_e,id)=>db().prepare('SELECT id,tipo,texto,creado_en AS creadoEn FROM evento_sesion WHERE sesion_id=? ORDER BY creado_en,id').all(id))
  ipcMain.handle('respaldo:exportar',async()=>{const destino=await dialog.showSaveDialog({title:'Exportar respaldo de Project Control',defaultPath:join(app.getPath('documents'),'ProjectControl-respaldo-'+new Date().toISOString().slice(0,10)+'.db'),filters:[{name:'Base de datos SQLite',extensions:['db']}]});if(destino.canceled||!destino.filePath)return null;db().pragma('wal_checkpoint(FULL)');copyFileSync(join(carpetaDatos(),'project-control.db'),destino.filePath);return destino.filePath})
}