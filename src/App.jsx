import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase";
import { Aviso, Condiciones } from "./Avisos";
import {
  WA, SENA, ALIAS, DIRECCION, INSTAGRAM, LASER, PLASMA, HORAS,
  proximosJueves, iso, corto, largo, pesos,
} from "./data";

const SERVICIOS = [...LASER, ...PLASMA];
const VACIO = { nombre: "", apellido: "", edad: "", tel: "", com: "" };
const MSG_HORARIOS = "No pudimos consultar los horarios. Revisá tu conexión e intentá de nuevo.";

const linkWa = (texto = "") => `https://wa.me/${WA}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;

// corta las consultas que tardan demasiado para no dejar la pantalla cargando para siempre
function conTimeout(ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, abortar: () => c.abort(), limpiar: () => clearTimeout(t) };
}

function Layout({ children }) {
  return (
    <>
      <header className="cab">
        <img src="/logo.png" alt="PRANA, estética y nutrición" />
        <p>Reservá tu turno online</p>
      </header>
      <main>{children}</main>
      <footer>
        <p>{DIRECCION}</p>
        <p>{INSTAGRAM}</p>
        <p className="credito">
          Creado por{" "}
          <span className="creator-name" aria-label="Chelitowan">
            {Array.from("Chelitowan").map((letter, index) => (
              <span className="creator-letter" aria-hidden="true" key={`${letter}-${index}`} style={{ "--letter-index": index }}>
                {letter}
              </span>
            ))}
          </span>{" "}
          <span className="creator-heart" aria-hidden="true">♥</span>
        </p>
      </footer>
    </>
  );
}

function Filas({ sel }) {
  if (sel.length === 0) return <div><span>Servicios</span><span>-</span></div>;
  return sel.map((x) => (
    <div key={x.nombre}><span>{x.nombre}</span><span>{pesos(x.precio)}</span></div>
  ));
}

function Opcion({ item, activo, onClick }) {
  return (
    <button type="button" className="op" aria-pressed={activo} onClick={onClick}>
      <span>{item.nombre}</span>
      <span className="pr">{pesos(item.precio)}</span>
    </button>
  );
}

export default function App() {
  const fechas = useMemo(() => proximosJueves(), []);
  const [servs, setServs] = useState([]);
  const [fecha, setFecha] = useState(null);
  const [hora, setHora] = useState(null);
  const [ocupadas, setOcupadas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [errHorarios, setErrHorarios] = useState("");
  const [refresco, setRefresco] = useState(0);
  const [f, setF] = useState(VACIO);
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState("");
  const [errWa, setErrWa] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [hecho, setHecho] = useState(null);
  const errRef = useRef(null);

  // cada vez que cambia el día, consulta qué horarios ya están tomados
  useEffect(() => {
    if (fecha === null || !supabase) return;
    let vigente = true;
    const t = conTimeout(10000);
    setHora(null);
    setOcupadas([]);
    setErrHorarios("");
    setCargando(true);
    supabase
      .rpc("horarios_ocupados", { p_fecha: iso(fechas[fecha]) })
      .abortSignal(t.signal)
      .then(({ data, error: err }) => {
        if (!vigente) return;
        if (err) return setErrHorarios(MSG_HORARIOS);
        setOcupadas(data.map((r) => r.hora.slice(0, 5)));
      })
      .catch(() => vigente && setErrHorarios(MSG_HORARIOS))
      .finally(() => {
        t.limpiar();
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
      t.limpiar();
      t.abortar();
    };
  }, [fecha, fechas, refresco]);

  const cambiar = (campo) => (e) => setF({ ...f, [campo]: e.target.value });
  const alternar = (i) =>
    setServs((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i].sort((a, b) => a - b)));

  function fallo(msg, conWa = false) {
    setError(msg);
    setErrWa(conWa);
    setTimeout(() => errRef.current && errRef.current.focus(), 0);
  }

  async function reservar(e) {
    e.preventDefault();
    const tel = f.tel.replace(/\D/g, "");
    const edad = Number(f.edad);
    const nombre = f.nombre.trim();
    const apellido = f.apellido.trim();
    const com = f.com.trim();
    if (servs.length === 0) return fallo("Elegí al menos un servicio.");
    if (fecha === null) return fallo("Elegí un día.");
    if (!hora) return fallo("Elegí un horario.");
    if (!nombre || !apellido) return fallo("Completá tu nombre y apellido.");
    if (!edad || edad < 1 || edad > 99) return fallo("Ingresá tu edad.");
    if (tel.length < 8 || tel.length > 15) return fallo("Ingresá un teléfono válido para coordinar.");
    if (!acepta) return fallo("Para reservar tenés que aceptar el aviso de privacidad.");

    setEnviando(true);
    setError("");
    setErrWa(false);
    const sel = servs.map((i) => SERVICIOS[i]);
    const total = sel.reduce((suma, x) => suma + x.precio, 0);
    const t = conTimeout(15000);
    let err = null;
    try {
      const r = await supabase
        .from("turnos")
        .insert({
          fecha: iso(fechas[fecha]),
          hora,
          servicio: sel.map((x) => x.nombre).join(" + "),
          precio: total,
          nombre,
          apellido,
          edad,
          telefono: tel,
          comentarios: com || null,
          acepta_privacidad: true,
        })
        .abortSignal(t.signal);
      err = r.error;
    } catch (ex) {
      err = ex;
    }
    t.limpiar();
    setEnviando(false);

    if (err) {
      const cortada = err.name === "AbortError" || /abort/i.test(err.message || "");
      if (err.code === "23505") {
        fallo("Ese horario se acaba de reservar. Elegí otro.");
        setRefresco((n) => n + 1);
      } else if (cortada) {
        fallo(
          "La conexión tardó demasiado y no podemos confirmar si tu reserva se guardó. Antes de volver a intentar, escribinos por WhatsApp.",
          true
        );
      } else {
        fallo("No pudimos guardar tu turno. Probá de nuevo; si sigue fallando, escribinos por WhatsApp.", true);
      }
      return;
    }
    setHecho({ sel, total, dia: fechas[fecha], hora, nombre, apellido, edad, tel, com });
  }

  function otra() {
    setHecho(null);
    setServs([]);
    setFecha(null);
    setHora(null);
    setOcupadas([]);
    setF(VACIO);
    setAcepta(false);
    setError("");
    setErrWa(false);
  }

  if (!supabase) {
    return (
      <Layout>
        <h2>Reservas online no disponibles</h2>
        <p>Por ahora no podemos tomar reservas desde esta página. Escribinos por WhatsApp y coordinamos tu turno.</p>
        <a className="btn" target="_blank" rel="noopener noreferrer" href={linkWa()}>Escribir por WhatsApp</a>
      </Layout>
    );
  }

  if (hecho) {
    const msg =
      `Hola PRANA! Reservé un turno desde la web.\n\n` +
      `Servicios:\n${hecho.sel.map((x) => `- ${x.nombre} (${pesos(x.precio)})`).join("\n")}\n` +
      `Total: ${pesos(hecho.total)}\n` +
      `Día: ${largo(hecho.dia)}\nHora: ${hecho.hora}\n` +
      `Nombre: ${hecho.nombre} ${hecho.apellido}\nEdad: ${hecho.edad}\nTeléfono: ${hecho.tel}` +
      (hecho.com ? `\nComentarios: ${hecho.com}` : "") +
      `\n\nTe envío el comprobante de la seña de ${pesos(SENA)}.`;
    return (
      <Layout>
        <h2>Turno registrado: falta la seña</h2>
        <p className="estado" role="status">Estado de tu turno: <strong>pendiente de pago de la seña</strong></p>
        <div className="resumen">
          <div><span>Día y hora</span><span>{largo(hecho.dia)} · {hecho.hora}</span></div>
          <div><span>A nombre de</span><span>{hecho.nombre} {hecho.apellido}</span></div>
          <Filas sel={hecho.sel} />
          <div className="total"><span>Total de servicios</span><span>{pesos(hecho.total)}</span></div>
          <div className="sena"><span>Seña a pagar ahora</span><span>{pesos(SENA)}</span></div>
        </div>
        <ol>
          <li>Transferí la seña de <strong>{pesos(SENA)}</strong> al alias <strong>{ALIAS}</strong>.</li>
          <li>Enviá el comprobante por WhatsApp.</li>
          <li>PRANA confirma el pago y tu turno pasa a <strong>confirmado</strong>.</li>
        </ol>
        <Condiciones />
        <p className="nota">Te esperamos en {DIRECCION}.</p>
        <a className="btn" target="_blank" rel="noopener noreferrer" href={linkWa(msg)}>
          Enviar comprobante por WhatsApp
        </a>
        <button type="button" className="btn sec" onClick={otra}>Hacer otra reserva</button>
      </Layout>
    );
  }

  const sel = servs.map((i) => SERVICIOS[i]);
  const total = sel.reduce((suma, x) => suma + x.precio, 0);
  const horasBloqueadas = cargando || Boolean(errHorarios);
  return (
    <Layout>
      <form onSubmit={reservar} noValidate>
        <h2 id="h-serv">1. Elegí tus servicios</h2>
        <p className="nota">Podés elegir más de uno: se suman en el total.</p>
        <div role="group" aria-labelledby="h-serv">
          <h3>Depilación láser</h3>
          {LASER.map((s, i) => (
            <Opcion key={s.nombre} item={s} activo={servs.includes(i)} onClick={() => alternar(i)} />
          ))}
          <h3>Plasma rico en plaquetas</h3>
          {PLASMA.map((s, i) => (
            <Opcion key={s.nombre} item={s} activo={servs.includes(LASER.length + i)} onClick={() => alternar(LASER.length + i)} />
          ))}
        </div>
        <p className="nota">
          2x1 en la misma persona: 2 zonas a elección por el precio de 1. Zonas: facial, capilar, cuello, escote, manos y cicatrices.
        </p>

        <h2 id="h-dia">2. Elegí el día</h2>
        <p className="nota">Atendemos los jueves.</p>
        <div className="chips" role="group" aria-labelledby="h-dia">
          {fechas.map((d, i) => (
            <button key={iso(d)} type="button" className="chip" aria-pressed={fecha === i} aria-label={largo(d)} onClick={() => setFecha(i)}>
              {corto(d)}
            </button>
          ))}
        </div>

        <h2 id="h-hora">3. Elegí el horario</h2>
        {fecha === null ? (
          <p className="nota">Primero elegí un día.</p>
        ) : (
          <>
            <p className="nota" role="status" aria-live="polite">
              {cargando
                ? "Consultando horarios..."
                : errHorarios || "Cada turno dura 1 hora. Los horarios que dicen “Ocupado” ya están reservados."}
            </p>
            {errHorarios && !cargando && (
              <button type="button" className="btn sec chico" onClick={() => setRefresco((n) => n + 1)}>
                Reintentar
              </button>
            )}
            <div className="chips" role="group" aria-labelledby="h-hora">
              {HORAS.map((h) => {
                const ocup = ocupadas.includes(h);
                return (
                  <button
                    key={h}
                    type="button"
                    className={ocup ? "chip ocupado" : "chip"}
                    aria-pressed={hora === h}
                    aria-label={ocup ? `${h}, ocupado` : h}
                    disabled={horasBloqueadas || ocup}
                    onClick={() => setHora(h)}
                  >
                    <span>{h}</span>
                    {ocup && <small>Ocupado</small>}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <h2>4. Tus datos</h2>
        <div className="fila">
          <div>
            <label htmlFor="nombre">Nombre</label>
            <input id="nombre" autoComplete="given-name" maxLength={60} required value={f.nombre} onChange={cambiar("nombre")} />
          </div>
          <div>
            <label htmlFor="edad">Edad</label>
            <input id="edad" type="number" inputMode="numeric" min="1" max="99" required value={f.edad} onChange={cambiar("edad")} />
          </div>
        </div>
        <label htmlFor="apellido">Apellido</label>
        <input id="apellido" autoComplete="family-name" maxLength={60} required value={f.apellido} onChange={cambiar("apellido")} />
        <label htmlFor="tel">Teléfono (WhatsApp)</label>
        <input id="tel" type="tel" inputMode="tel" autoComplete="tel" placeholder="11 5555 1234" required value={f.tel} onChange={cambiar("tel")} />
        <label htmlFor="com">Zonas o comentarios (opcional)</label>
        <textarea id="com" rows={2} maxLength={300} value={f.com} onChange={cambiar("com")} />

        <Aviso />
        <label className="check" htmlFor="acepta">
          <input id="acepta" type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
          <span>Leí el aviso de privacidad y acepto que PRANA use mis datos para gestionar mi turno.</span>
        </label>

        <div className="resumen">
          <div><span>Día y hora</span><span>{fecha !== null && hora ? `${corto(fechas[fecha])} · ${hora}` : "-"}</span></div>
          <Filas sel={sel} />
          <div className="total"><span>Total de servicios</span><span>{pesos(total)}</span></div>
          <div className="sena"><span>Seña para reservar</span><span>{pesos(SENA)}</span></div>
        </div>
        <Condiciones />

        <p className="err" role="alert" tabIndex={-1} ref={errRef}>{error}</p>
        {errWa && (
          <a className="btn sec chico" target="_blank" rel="noopener noreferrer" href={linkWa()}>Escribir a PRANA por WhatsApp</a>
        )}
        <button className="btn" type="submit" disabled={enviando} aria-busy={enviando}>
          {enviando ? "Reservando..." : "Reservar turno"}
        </button>
      </form>
    </Layout>
  );
}
