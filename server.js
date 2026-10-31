const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE = "https://api-colombia.com/api/v1";

app.use(cors());
app.use(express.static(path.join(__dirname, "docs")));

// ---------- Caché en memoria ----------
// API Colombia limita algunos endpoints (~60 peticiones/minuto por IP).
// Guardamos cada respuesta una hora para no repetir peticiones.
const cache = new Map();
const TTL = 60 * 60 * 1000;

async function obtener(ruta) {
  const guardado = cache.get(ruta);
  if (guardado && Date.now() - guardado.t < TTL) {
    console.log("CACHÉ", BASE + ruta);
    return guardado.data;
  }

  console.log("GET", BASE + ruta);
  const resp = await fetch(BASE + ruta);
  if (!resp.ok)
    throw new Error(`API Colombia respondió ${resp.status} en ${ruta}`);
  const data = await resp.json();
  cache.set(ruta, { t: Date.now(), data });
  return data;
}

// ---------- Transformaciones ----------
// Nos quedamos solo con lo que el frontend necesita.
function limpiarPlato(p) {
  const ingredientes = (p.ingredients || "")
    .split(",")
    .map((i) => i.trim().replace(/\.$/, ""))
    .filter(Boolean);
  return {
    id: p.id,
    nombre: p.name,
    descripcion: p.description || "",
    ingredientes,
    imagen: p.imageUrl ? encodeURI(p.imageUrl) : null, // las URL traen espacios
  };
}

const esId = (valor) => /^\d+$/.test(valor);
const fallo = (res, error) => {
  console.error(error.message);
  res.status(502).json({ error: "No se pudo consultar API Colombia" });
};

// ---------- Rutas ----------
// GET /api/regiones
app.get("/api/regiones", async (req, res) => {
  try {
    const [regiones, departamentos] = await Promise.all([
      obtener("/Region"),
      obtener("/Department"),
    ]);
    res.json(
      regiones.map((r) => ({
        id: r.id,
        nombre: r.name,
        descripcion: r.description,
        departamentos: departamentos.filter((d) => d.regionId === r.id).length,
      })),
    );
  } catch (e) {
    fallo(res, e);
  }
});

// GET /api/regiones/:id/departamentos
app.get("/api/regiones/:id/departamentos", async (req, res) => {
  if (!esId(req.params.id))
    return res.status(400).json({ error: "id inválido" });
  try {
    const departamentos = await obtener("/Department");
    const lista = departamentos
      .filter((d) => d.regionId === Number(req.params.id))
      .map((d) => ({
        id: d.id,
        nombre: d.name,
        municipios: d.municipalities,
        poblacion: d.population,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    res.json(lista);
  } catch (e) {
    fallo(res, e);
  }
});

// GET /api/departamentos/:id  -> información + platos típicos + municipios
app.get("/api/departamentos/:id", async (req, res) => {
  const id = req.params.id;
  if (!esId(id)) return res.status(400).json({ error: "id inválido" });
  try {
    const [depto, platos, municipios] = await Promise.all([
      obtener(`/Department/${id}`),
      obtener(`/TypicalDish/${id}/department`),
      obtener(`/Department/${id}/cities`),
    ]);

    // La capital es un dato extra: si falla, seguimos sin ella.
    let capital = null;
    try {
      if (depto.cityCapitalId)
        capital = (await obtener(`/City/${depto.cityCapitalId}`)).name;
    } catch (e) {
      console.warn("No se pudo obtener la capital:", e.message);
    }

    res.json({
      id: depto.id,
      nombre: depto.name,
      descripcion: depto.description,
      capital,
      superficie: depto.surface,
      poblacion: depto.population,
      prefijo: depto.phonePrefix,
      regionId: depto.regionId,
      platos: (Array.isArray(platos) ? platos : []).map(limpiarPlato),
      municipios: municipios
        .map((m) => m.name)
        .sort((a, b) => a.localeCompare(b, "es")),
    });
  } catch (e) {
    fallo(res, e);
  }
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
