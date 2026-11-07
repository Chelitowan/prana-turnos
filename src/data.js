export const WA = "5491170638833";
export const SENA = 5000;
export const ALIAS = "PRANAESTETICAYNUTRI";
export const DIRECCION = "Av. Rivadavia 5012, piso 5";
export const INSTAGRAM = "@pranaesteticaynutricion";

export const LASER = [
  { nombre: "Cuerpo entero", precio: 30000 },
  { nombre: "Cavado, axilas y tira de cola", precio: 17000 },
  { nombre: "Cavado, ½ pierna y axilas", precio: 17500 },
  { nombre: "Axilas, pierna entera, cavado, tira de cola y bozo", precio: 20000 },
  { nombre: "Pecho y espalda", precio: 17500 },
  { nombre: "Depilación facial / barba", precio: 10000 },
  { nombre: "3 zonas a elección", precio: 15000 },
];
export const PLASMA = [{ nombre: "Plasma rico en plaquetas", precio: 60000 }];

// turnos de 1 hora, de 09:00 a 17:00 (el último termina a las 18:00)
export const HORAS = Array.from({ length: 9 }, (_, i) => String(i + 9).padStart(2, "0") + ":00");

export const pesos = (n) => "$" + n.toLocaleString("es-AR");

// próximos jueves, empezando desde mañana
export function proximosJueves(cantidad = 6) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  do {
    d.setDate(d.getDate() + 1);
  } while (d.getDay() !== 4);
  const lista = [];
  for (let i = 0; i < cantidad; i++) {
    lista.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return lista;
}

// fecha local en formato YYYY-MM-DD (sin pasar por UTC)
export const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const corto = (d) => `Jue ${d.getDate()}/${d.getMonth() + 1}`;
export const largo = (d) =>
  d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

export const TELEFONO_VISIBLE = "1170638833";

// ─── A DEFINIR POR PRANA ────────────────────────────────────────────────────
// Mientras un valor sea null la app NO inventa plazos ni reglas: invita a consultar por WhatsApp.
// Escribir el texto tal como se quiere mostrar a la clienta.
export const TERMINOS = {
  plazoPago: null, // plazo para pagar la seña
  cancelacion: null, // política de cancelación
  cambios: null, // política de cambios de turno
  sinPago: null, // qué pasa si no se paga la seña
};

// Datos del aviso de privacidad que PRANA debe confirmar (ver README, sección "Pendientes").
export const PRIVACIDAD = {
  responsable: "PRANA, estética y nutrición", // confirmar nombre del titular/responsable
  conservacion: null, // por cuánto tiempo se conservan los datos (texto), null = no se muestra
};
