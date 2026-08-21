import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// Orígenes permitidos para CORS
app.use("*", cors({
  origin: (origin) => {
    // Permitir localhost con cualquier puerto (desarrollo)
    if (origin && origin.startsWith("http://localhost")) return origin;
    // Permitir dominio de producción
    if (origin && origin === "https://peliteca.infocat.workers.dev") return origin;
    return null;
  }
}));

// 1. Obtener el token de SteamGridDB desde las variables de entorno
const API_STEAM = Deno.env.get("API_STEAM");

if (!API_STEAM) {
  console.warn("⚠️ Advertencia: La variable de entorno API_STEAM no está configurada.");
}

const STEAMGRIDDB_BASE_URL = "https://www.steamgriddb.com/api/v2";

// 2. Función para buscar juegos (Autocomplete de SteamGridDB)
async function buscarJuegoSteam(query: string) {
  const url = `${STEAMGRIDDB_BASE_URL}/search/autocomplete/${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${API_STEAM}`,
      "Accept": "application/json"
    }
  });
  if (!res.ok) throw new Error('Error buscando juego: ' + res.status);
  return res.json();
}

// 3. Función para buscar portadas (Grids de SteamGridDB)
async function buscarPortadasSteam(id: string | number) {
  const url = `${STEAMGRIDDB_BASE_URL}/grids/game/${encodeURIComponent(String(id))}??dimensions=600x900&limit=6`;
  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${API_STEAM}`,
      "Accept": "application/json"
    }
  });
  if (!res.ok) throw new Error('Error buscando portadas: ' + res.status);
  return res.json();
}

// --- Rutas de Hono ---

app.get("/", (c) => {
  return c.json({
    saludo: "Hola karl!",
    version: 1.0
  });
});

// Ruta para buscar juegos
app.get("/api/buscar/:query", async (c) => {
  try {
    const query = c.req.param("query");
    const data = await buscarJuegoSteam(query);
    return c.json(data);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Ruta para buscar portadas
app.get("/api/portadas/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await buscarPortadasSteam(id);
    return c.json(data);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

Deno.serve(app.fetch);