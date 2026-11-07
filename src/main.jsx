import React, { Suspense, lazy, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// El panel se carga aparte: la página pública no descarga su código.
const Admin = lazy(() => import("./Admin.jsx"));
const enAdmin = () => window.location.hash.startsWith("#/admin");

function Root() {
  const [admin, setAdmin] = useState(enAdmin());
  useEffect(() => {
    const f = () => setAdmin(enAdmin());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  return admin ? (
    <Suspense fallback={<p className="nota" style={{ padding: 16 }}>Cargando...</p>}>
      <Admin />
    </Suspense>
  ) : (
    <App />
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
