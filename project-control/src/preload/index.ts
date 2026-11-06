import { contextBridge, ipcRenderer } from 'electron'
import type { ApiProjectControl } from '../shared/types'

const api: ApiProjectControl = {
  listarProyectos: () => ipcRenderer.invoke('proyectos:listar'),
  infoApp: () => ipcRenderer.invoke('app:info')
}

contextBridge.exposeInMainWorld('api', api)
