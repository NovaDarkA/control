import { useEffect, useState } from 'react'
import { ETIQUETA_ESTADO, type EstadoProyecto, type ProyectoResumen } from '../../shared/types'

function progreso(p: ProyectoResumen): string {
  if (p.tareasTotal === 0) return 'Sin definir'
  return `${Math.round((p.tareasHechas / p.tareasTotal) * 100)} % · ${p.tareasHechas} de ${p.tareasTotal} tareas`
}

export function App() {
  const [proyectos, setProyectos] = useState<ProyectoResumen[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api
      .listarProyectos()
      .then(setProyectos)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  const cuenta = (estado: EstadoProyecto) =>
    proyectos?.filter((p) => p.estado === estado).length ?? 0
  const conPaso = proyectos?.filter((p) => p.proximoPaso) ?? []

  return (
    <div className="app">
      <nav className="lateral" aria-label="Secciones">
        <div className="marca">Project Control</div>
        <a className="activo" aria-current="page">Panel</a>
        <span className="pendiente" title="Disponible en una fase posterior">Proyectos</span>
        <span className="pendiente" title="Disponible en una fase posterior">Historial</span>
        <span className="pendiente" title="Disponible en una fase posterior">Respaldos</span>
      </nav>

      <main className="contenido">
        <section className="sesion-actual">
          <div>
            <h2>Sesión actual</h2>
            <p>No hay ninguna sesión en curso.</p>
          </div>
          <button disabled title="Disponible en una fase posterior">
            Iniciar sesión
          </button>
        </section>

        {error && <p role="alert" className="error">No se pudieron cargar los proyectos: {error}</p>}

        {proyectos && (
          <>
            <section className="resumen" aria-label="Resumen de proyectos">
              <p><strong>{proyectos.length}</strong> proyectos</p>
              <p><strong>{cuenta('en_progreso')}</strong> en progreso</p>
              <p><strong>{cuenta('en_pausa')}</strong> en pausa</p>
              <p><strong>{cuenta('bloqueado')}</strong> bloqueados</p>
              <p><strong>{cuenta('completado')}</strong> completados</p>
            </section>

            <section>
              <h2>Proyectos</h2>
              <ul className="lista">
                {proyectos.map((p) => (
                  <li key={p.id}>
                    <div className="fila-titulo">
                      <span className="nombre">{p.nombre}</span>
                      <span className={`estado estado-${p.estado}`}>{ETIQUETA_ESTADO[p.estado]}</span>
                    </div>
                    <div className="detalle">
                      <span>Progreso: {progreso(p)}</span>
                      <span>Último avance: {p.ultimoAvance ?? 'Sin registrar'}</span>
                      <span>Próximo paso: {p.proximoPaso ?? 'Sin definir'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Próximos pasos</h2>
              {conPaso.length === 0 ? (
                <p className="vacio">Aún no hay próximos pasos. Se registran al cerrar una sesión.</p>
              ) : (
                <ul className="pasos">
                  {conPaso.map((p) => (
                    <li key={p.id}><strong>{p.nombre}:</strong> {p.proximoPaso}</li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2>Última actividad</h2>
              <p className="vacio">Aún no hay actividad registrada.</p>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
