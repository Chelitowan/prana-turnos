# PRANA · Reservas online

App de reservas de turnos de PRANA, estética y nutrición. React + Vite + Supabase.

## Qué hace

- Servicios con precios (selección múltiple y total), jueves de 09:00 a 17:00, turnos de 1 hora.
- Horarios ocupados bloqueados (consulta `horarios_ocupados`) y sin doble reserva garantizada **en la base de datos**.
- Aviso de privacidad y casilla de consentimiento obligatoria.
- Turno `pendiente` hasta que PRANA confirme la seña; confirmación por WhatsApp.
- Panel de administración protegido por login en `/#/admin`.

## Desarrollo local

```bash
npm install
cp .env.example .env     # completar las dos variables (ver abajo)
npm run dev
```

## Variables de entorno

| Variable | De dónde sale |
|---|---|
| `VITE_SUPABASE_URL` | Supabase > Project Settings > API > Project URL |
| `VITE_SUPABASE_KEY` | Supabase > Project Settings > API > clave **pública** (publishable / anon) |

Usar solo la clave pública. **Nunca** poner la `service_role` ni claves secretas en el frontend (todo lo que lleva `VITE_` queda visible en el navegador). `.env` está en `.gitignore`. Si faltan las variables, la app muestra un aviso con el contacto por WhatsApp en vez de romperse.

## Base de datos (Supabase)

El esquema está en `supabase/migrations/`, en este orden:

1. `20261011000000_crear_turnos.sql`: tabla, restricciones, índice único anti doble reserva, función `horarios_ocupados`.
2. `20261017000000_privacidad_permisos_admin.sql`: permisos mínimos, consentimiento, lista de administradores y políticas.

Ambas **ya están aplicadas** en el proyecto `prana-turnos`. Para un proyecto nuevo: `supabase db push` (CLI) o pegarlas en orden en el SQL Editor.

### Modelo de seguridad

- El público (`anon`) solo puede **crear** turnos `pendiente`, a futuro y con consentimiento. No puede leer, modificar ni borrar nada. No tiene permiso `SELECT` sobre la tabla.
- El público consulta disponibilidad solo con `horarios_ocupados(fecha)`, que devuelve únicamente horas, sin datos personales.
- Ver, cambiar el estado o eliminar turnos requiere un usuario autenticado **que esté en la tabla `admins`**. Un usuario registrado que no esté en esa lista no ve nada.
- Validaciones en la base: solo jueves, horas en punto de 09:00 a 17:00, largo de textos, teléfono de 8 a 15 dígitos, estados válidos, un solo turno activo por fecha y hora.

### Alta del administrador (una vez)

1. Supabase > Authentication > Users > Add user (email y contraseña de PRANA).
2. Supabase > SQL Editor: ejecutar `supabase/migrations/20261017000100_alta_admin.EJEMPLO.sql` con el email real.
3. Supabase > Authentication > Sign In / Providers: **desactivar "Allow new users to sign up"**, así nadie más puede crear cuentas.

### Panel de administración

Se entra en `https://TU-DOMINIO/#/admin` con el email y la contraseña del usuario administrador. Muestra los turnos (por defecto desde hoy), permite filtrar por estado, escribir a la clienta por WhatsApp, cambiar el estado (`pendiente`, `confirmado`, `cancelado`, `ausente`) y eliminar un turno (para pedidos de eliminación de datos). Cancelar libera el horario. Si se intenta reactivar un turno cancelado cuyo horario ya tomó otra persona, la base lo rechaza.

La seguridad no depende del panel: aunque alguien llegue a esa URL, sin ser administrador la base no devuelve ningún dato. Alternativa sin panel: Supabase > Table Editor > `turnos`.

El WhatsApp de cada clienta asume número argentino (se antepone 549). Si alguien escribió su número con 15 adelante, el enlace puede fallar; en ese caso corregir el número desde el Table Editor.

## Publicación en Vercel

1. Subir el proyecto a un repositorio de GitHub (sin `.env`).
2. Vercel > Add New > Project > importar el repositorio. Framework: Vite (se detecta solo). Build: `npm run build`, salida: `dist`.
3. Settings > Environment Variables: cargar `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY` para Production y Preview.
4. Deploy.
5. Supabase > Authentication > URL Configuration: poner la URL de producción en **Site URL** (solo importa cuando haya login de administrador).

`vercel.json` agrega cabeceras de seguridad (CSP, no embebido en iframes, etc.). La CSP solo permite conectar a `*.supabase.co`; si se suma otro servicio externo hay que habilitarlo ahí.

Aviso del plan gratis de Supabase: pausa el proyecto tras una semana sin actividad y, pausado, las reservas fallan. Se reactiva desde el panel de Supabase.

## Datos personales: revisión de campos

| Campo | Estado |
|---|---|
| Nombre, apellido, teléfono | Necesarios: identificar el turno y contactar por WhatsApp. |
| Edad | Se mantiene. Útil si algún servicio tiene restricciones de edad; **PRANA debe confirmar si la necesita** antes de quitarla. |
| Comentarios | Opcional (zonas elegidas, aclaraciones). El aviso pide no incluir datos de salud. |

## Pendientes de PRANA antes de salir a producción

Nada de esto está inventado en la app; son decisiones de PRANA:

1. **Condiciones de la reserva**: plazo para pagar la seña, qué pasa si no se paga, cancelaciones y cambios. Se completan en `TERMINOS` (`src/data.js`). Mientras estén en `null`, la app solo dice que el turno queda pendiente hasta confirmar la seña y que lo demás se consulta por WhatsApp.
2. **Aviso de privacidad**: confirmar el nombre del titular/responsable y por cuánto tiempo se conservan los datos (`PRIVACIDAD` en `src/data.js`), y confirmar que PRANA va a atender por WhatsApp los pedidos de corrección o eliminación.
3. **Revisión legal**: consultar con un profesional el cumplimiento de la normativa de protección de datos personales aplicable (incluido si corresponde registrar la base de datos, el almacenamiento en servidores de Brasil y el tratamiento de edad y comentarios en servicios de salud y estética) y revisar el texto del aviso. La app **no afirma** cumplir ninguna ley.
4. **Menores de edad**: definir si se atienden y, en ese caso, qué autorización se requiere.
5. **Horario**: confirmar que el último turno empieza a las 17:00 y que 1 hora alcanza cuando se eligen varios servicios.
6. **Administrador**: crear el usuario y desactivar el registro público (ver arriba).
7. **Seña**: verificar que el alias de pago `PRANAESTETICAYNUTRI` sea el vigente.

## Comandos

```bash
npm run dev       # desarrollo
npm run build     # build de producción en dist/
npm run preview   # probar el build localmente
npm audit         # revisar dependencias
```
