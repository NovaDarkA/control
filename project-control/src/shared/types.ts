export type EstadoProyecto = 'por_iniciar' | 'en_progreso' | 'en_pausa' | 'bloqueado' | 'completado'
export const ETIQUETA_ESTADO: Record<EstadoProyecto, string> = {
  por_iniciar: 'Por iniciar', en_progreso: 'En progreso', en_pausa: 'En pausa',
  bloqueado: 'Bloqueado', completado: 'Completado'
}
export interface ProyectoResumen {
  id:number; nombre:string; descripcion:string; objetivo:string; estado:EstadoProyecto;
  creadoEn:string; ultimoAvance:string|null; proximoPaso:string|null;
  tareasTotal:number; tareasHechas:number
}
export interface InfoApp { version:string; rutaDatos:string }
export interface Tarea { id:number; proyectoId:number; titulo:string; hecha:boolean; creadoEn:string }
export interface EventoSesion { id:number; tipo:string; texto:string; creadoEn:string }
export interface Sesion {
  id:string; proyectoId:number; proyectoNombre:string; motivo:string; objetivo:string;
  prioridad:'alta'|'media'|'baja'; estado:'activa'|'pausada'|'cerrada';
  inicioEn:string; cierreEn:string|null; siguientePaso:string|null; tiempoEfectivo:number
}
export interface SesionCierre {
  actividadesCompletadas:string; resultados:string; decisiones:string;
  problemasPendientes:string; tareasSinTerminar:string; siguientePaso:string
}
export interface ApiProjectControl {
  listarProyectos():Promise<ProyectoResumen[]>;
  infoApp():Promise<InfoApp>;
  actualizarProyecto(data:{id:number;nombre:string;descripcion:string;objetivo:string;estado:EstadoProyecto;proximoPaso:string}):Promise<void>;
  listarTareas(proyectoId:number):Promise<Tarea[]>;
  agregarTarea(data:{proyectoId:number;titulo:string}):Promise<void>;
  cambiarTarea(data:{id:number;hecha:boolean}):Promise<void>;
  eliminarTarea(id:number):Promise<void>;
  sesionActual():Promise<Sesion|null>;
  iniciarSesion(data:{proyectoId:number;motivo:string;objetivo:string;prioridad:'alta'|'media'|'baja'}):Promise<void>;
  registrarEvento(data:{tipo:'actividad'|'avance'|'resultado_parcial'|'decision'|'problema'|'interrupcion';texto:string}):Promise<void>;
  pausarSesion():Promise<void>;
  reanudarSesion():Promise<void>;
  cerrarSesion(data:SesionCierre):Promise<void>;
  historial(proyectoId?:number):Promise<Sesion[]>;
  eventosSesion(id:string):Promise<EventoSesion[]>;
  exportarRespaldo():Promise<string|null>;
  latido():Promise<void>;
}