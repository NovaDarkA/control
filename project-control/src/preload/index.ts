import { contextBridge, ipcRenderer } from 'electron'
import type { ApiProjectControl } from '../shared/types'
const api:ApiProjectControl = {
  listarProyectos:()=>ipcRenderer.invoke('proyectos:listar'),
  infoApp:()=>ipcRenderer.invoke('app:info'),
  actualizarProyecto:(data)=>ipcRenderer.invoke('proyectos:actualizar',data),
  listarTareas:(id)=>ipcRenderer.invoke('tareas:listar',id),
  agregarTarea:(data)=>ipcRenderer.invoke('tareas:agregar',data),
  cambiarTarea:(data)=>ipcRenderer.invoke('tareas:cambiar',data),
  eliminarTarea:(id)=>ipcRenderer.invoke('tareas:eliminar',id),
  sesionActual:()=>ipcRenderer.invoke('sesion:actual'),
  iniciarSesion:(data)=>ipcRenderer.invoke('sesion:iniciar',data),
  registrarEvento:(data)=>ipcRenderer.invoke('sesion:evento',data),
  pausarSesion:()=>ipcRenderer.invoke('sesion:pausar'),
  reanudarSesion:()=>ipcRenderer.invoke('sesion:reanudar'),
  cerrarSesion:(data)=>ipcRenderer.invoke('sesion:cerrar',data),
  historial:(id)=>ipcRenderer.invoke('historial:listar',id),
  eventosSesion:(id)=>ipcRenderer.invoke('historial:eventos',id),
  exportarRespaldo:()=>ipcRenderer.invoke('respaldo:exportar'),
  latido:()=>ipcRenderer.invoke('sesion:latido')
}
contextBridge.exposeInMainWorld('api',api)