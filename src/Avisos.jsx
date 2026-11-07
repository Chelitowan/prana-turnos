import { SENA, TELEFONO_VISIBLE, INSTAGRAM, TERMINOS, PRIVACIDAD, pesos } from "./data";

export function Aviso() {
  return (
    <section className="aviso" aria-labelledby="h-priv">
      <h3 id="h-priv">Aviso de privacidad</h3>
      <p>
        Para reservar te pedimos nombre, apellido, edad, teléfono y, si querés, un comentario. Usamos estos
        datos solo para gestionar y confirmar tu turno y para contactarte por WhatsApp si hace falta coordinar.
      </p>
      <details>
        <summary>Ver aviso completo</summary>
        <ul>
          <li>
            <strong>Quién los gestiona:</strong> {PRIVACIDAD.responsable}. Contacto: WhatsApp {TELEFONO_VISIBLE} o
            Instagram {INSTAGRAM}.
          </li>
          <li>
            <strong>Qué se guarda:</strong> los datos que cargás, los servicios elegidos, el día y la hora, y el
            estado del turno.
          </li>
          <li>
            <strong>Dónde:</strong> en una base de datos de Supabase con servidores en São Paulo, Brasil. Desde esta
            aplicación solo accede PRANA.
          </li>
          <li>
            <strong>Corregir o eliminar tus datos:</strong> escribinos por WhatsApp y pedí la corrección o la
            eliminación.
          </li>
          {PRIVACIDAD.conservacion && (
            <li>
              <strong>Conservación:</strong> {PRIVACIDAD.conservacion}
            </li>
          )}
          <li>Evitá escribir datos de salud o información muy personal en el comentario.</li>
        </ul>
      </details>
    </section>
  );
}

export function Condiciones() {
  const t = TERMINOS;
  const falta = !t.plazoPago || !t.cancelacion || !t.cambios || !t.sinPago;
  return (
    <section className="aviso" aria-labelledby="h-cond">
      <h3 id="h-cond">Condiciones de la reserva</h3>
      <ul>
        <li>
          Tu turno queda <strong>pendiente</strong> hasta que PRANA confirme el pago de la seña de {pesos(SENA)}.
        </li>
        {t.plazoPago && <li>{t.plazoPago}</li>}
        {t.sinPago && <li>{t.sinPago}</li>}
        {t.cancelacion && <li>{t.cancelacion}</li>}
        {t.cambios && <li>{t.cambios}</li>}
      </ul>
      {falta && (
        <p className="nota">
          Para cancelar, cambiar el turno o consultar qué pasa si no se paga la seña, escribinos por WhatsApp.
        </p>
      )}
    </section>
  );
}
