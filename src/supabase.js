import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;

// Si faltan las variables de entorno la app no se rompe: muestra un aviso y el contacto por WhatsApp.
export const supabase = url && key ? createClient(url, key) : null;
