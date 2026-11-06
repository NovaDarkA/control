export type EstadoProyecto =
  | 'por_iniciar'
  | 'en_progreso'
  | 'en_pausa'
  | 'bloqueado'
  | 'completado'

export const ETIQUETA_ESTADO: Record<EstadoProyecto, string> = {
  por_iniciar: 'Por iniciar',
  en_progreso: 'En progreso',
  en_pausa: 'En pausa',
  bloqueado: 'Bloqueado',
  completado: 'Completado'
}

export interface ProyectoResumen {
  id: number
  nombre: string
  descripcion: string
  objetivo: string
  estado: EstadoProyecto
  creadoEn: string
  ultimoAvance: string | null
  proximoPaso: string | null
  tareasTotal: number
  tareasHechas: number
}

export interface InfoApp {
  version: string
  rutaDatos: string
}

export interface ApiProjectControl {
  listarProyectos(): Promise<ProyectoResumen[]>
  infoApp(): Promise<InfoApp>
}
