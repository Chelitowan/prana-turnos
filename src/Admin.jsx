import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { SENA, pesos } from "./data";

const ESTADOS = ["pendiente", "confirmado", "cancelado", "ausente"];
const pad = (n) => String(n).padStart(2, "0");
const fechaLocal = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const largo = (s) => fechaLocal(s).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
// teléfono tal como lo cargó la clienta -> número de WhatsApp argentino (54 9 ...)
function waLink(tel) {
  let n = String(tel).replace(/\D/g, "").replace(/^0+/, "");
  if (n.startsWith("549")) return `https://wa.me/${n}`;
  if (n.startsWith("54")) return `https://wa.me/549${n.slice(2)}`;
  return `https://wa.me/549${n}`;
}

export default function Admin() {
  const [sesion, setSesion] = useState(undefined); // undefined: cargando · null: sin sesión
  const [permiso, setPermiso] = useState(null); // null: verificando
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [trabajando, setTrabajando] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [soloProximos, setSoloProximos] = useState(true);

  useEffect(() => {
    document.title = "PRANA · Administración";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // la verificación real de permisos la hace la base (RLS); esto solo decide qué pantalla mostrar
  useEffect(() => {
    if (!supabase || !sesion) {
      setPermiso(null);
      return;
    }
    setPermiso(null);
    supabase.rpc("es_admin").then(({ data, error }) => setPermiso(error ? false : data === true));
  }, [sesion]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErr("");
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 15000);
    const { data, error } = await supabase
      .from("turnos")
      .select("*")
      .order("fecha")
      .order("hora")
      .abortSignal(c.signal);
    clearTimeout(t);
    setCargando(false);
    if (error) return setErr("No pudimos cargar los turnos. Revisá tu conexión e intentá de nuevo.");
    setTurnos(data);
  }, []);

  useEffect(() => {
    if (permiso) cargar();
  }, [permiso, cargar]);

  async function entrar(e) {
    e.preventDefault();
    setErr("");
    setEntrando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: clave });
    setEntrando(false);
    if (error) setErr("Email o contraseña incorrectos.");
    else setClave("");
  }

  async function cambiarEstado(t, estado) {
    if (estado === t.estado) return;
    setTrabajando(t.id);
    setMsg("");
    const { data, error } = await supabase.from("turnos").update({ estado }).eq("id", t.id).select("id");
    setTrabajando(null);
    if (error) {
      return setMsg(
        error.code === "23505"
          ? "No se pudo: ese horario ya lo tiene otro turno activo."
          : "No pudimos actualizar el turno. Probá de nuevo."
      );
    }
    if (!data || data.length === 0) return setMsg("No tenés permiso para modificar este turno.");
    setTurnos((prev) => prev.map((x) => (x.id === t.id ? { ...x, estado } : x)));
    setMsg(`Turno de ${t.nombre} ${t.apellido}: ${estado}.`);
  }

  async function eliminar(t) {
    const ok = window.confirm(
      `¿Eliminar definitivamente el turno de ${t.nombre} ${t.apellido}? Se borran sus datos y no se puede deshacer.`
    );
    if (!ok) return;
    setTrabajando(t.id);
    setMsg("");
    const { data, error } = await supabase.from("turnos").delete().eq("id", t.id).select("id");
    setTrabajando(null);
    if (error || !data || data.length === 0) return setMsg("No pudimos eliminar el turno. Probá de nuevo.");
    setTurnos((prev) => prev.filter((x) => x.id !== t.id));
    setMsg("Turno eliminado.");
  }

  const cab = (
    <header className="cab chica">
      <img src="/logo.png" alt="PRANA, estética y nutrición" />
      <p>Administración de turnos</p>
    </header>
  );

  if (!supabase) {
    return (
      <>
        {cab}
        <main className="ancha"><p>Falta configurar la conexión a Supabase (variables de entorno).</p></main>
      </>
    );
  }
  if (sesion === undefined) return <>{cab}<main className="ancha"><p role="status">Cargando...</p></main></>;

  if (!sesion) {
    return (
      <>
        {cab}
        <main>
          <h2>Ingresar</h2>
          <form onSubmit={entrar}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <label htmlFor="clave">Contraseña</label>
            <input id="clave" type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} />
            <p className="err" role="alert">{err}</p>
            <button className="btn" type="submit" disabled={entrando} aria-busy={entrando}>
              {entrando ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </main>
      </>
    );
  }

  const salir = () => supabase.auth.signOut();
  if (permiso === null) return <>{cab}<main className="ancha"><p role="status">Verificando permisos...</p></main></>;
  if (!permiso) {
    return (
      <>
        {cab}
        <main>
          <h2>Sin permiso</h2>
          <p>Tu usuario no tiene permiso de administrador. Ingresá con la cuenta de PRANA.</p>
          <button type="button" className="btn sec" onClick={salir}>Cerrar sesión</button>
        </main>
      </>
    );
  }

  const hoy = hoyIso();
  const visibles = turnos.filter((t) => (filtro === "todos" || t.estado === filtro) && (!soloProximos || t.fecha >= hoy));
  return (
    <>
      {cab}
      <main className="ancha">
        <div className="barra">
          <button type="button" className="btn sec chico" onClick={cargar} disabled={cargando}>
            {cargando ? "Actualizando..." : "Actualizar"}
          </button>
          <button type="button" className="btn sec chico" onClick={salir}>Cerrar sesión</button>
        </div>

        <div className="barra filtros">
          <label htmlFor="filtro">Estado</label>
          <select id="filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="todos">Todos ({turnos.length})</option>
            {ESTADOS.map((s) => (
              <option key={s} value={s}>{s} ({turnos.filter((t) => t.estado === s).length})</option>
            ))}
          </select>
          <label className="check" htmlFor="prox">
            <input id="prox" type="checkbox" checked={soloProximos} onChange={(e) => setSoloProximos(e.target.checked)} />
            <span>Solo desde hoy</span>
          </label>
        </div>

        <p className="nota" role="status" aria-live="polite">{msg}</p>
        <p className="err" role="alert">{err}</p>

        {!cargando && visibles.length === 0 && !err && <p>No hay turnos para mostrar.</p>}
        <ul className="lista">
          {visibles.map((t) => (
            <li key={t.id} className="tcard">
              <div className="thead">
                <strong>{largo(t.fecha)} · {t.hora.slice(0, 5)}</strong>
                <span className={`est est-${t.estado}`}>{t.estado}</span>
              </div>
              <p>{t.servicio}<br /><strong>{pesos(t.precio)}</strong> en servicios · seña {pesos(SENA)}</p>
              <p>
                {t.nombre} {t.apellido}, {t.edad} años ·{" "}
                <a href={waLink(t.telefono)} target="_blank" rel="noopener noreferrer">{t.telefono} (WhatsApp)</a>
              </p>
              {t.comentarios && <p className="nota">Comentarios: {t.comentarios}</p>}
              <div className="acciones">
                <label htmlFor={`e-${t.id}`}>Cambiar estado</label>
                <select id={`e-${t.id}`} value={t.estado} disabled={trabajando === t.id} onChange={(e) => cambiarEstado(t, e.target.value)}>
                  {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button type="button" className="btn sec chico borrar" disabled={trabajando === t.id} onClick={() => eliminar(t)}>
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
