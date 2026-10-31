// En local el frontend lo sirve el mismo backend (ruta relativa).
// Al publicar el frontend en GitHub Pages, cambia la URL por la de tu backend desplegado.
const API_URL = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? ""
  : "https://sabores-de-colombia-ulo3.onrender.com";

const $ = (id) => document.getElementById(id);
const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("es-CO"));

// Crea elementos con textContent (evita inyectar HTML que venga de la API)
function el(tag, props = {}, ...hijos) {
  const nodo = document.createElement(tag);
  for (const [clave, valor] of Object.entries(props)) {
    if (clave === "class") nodo.className = valor;
    else if (clave === "text") nodo.textContent = valor;
    else if (clave.startsWith("on"))
      nodo.addEventListener(clave.slice(2), valor);
    else nodo.setAttribute(clave, valor);
  }
  hijos.flat().forEach((h) => h && nodo.append(h));
  return nodo;
}

async function pedirJSON(ruta, intentos = 6) {
  const url = API_URL + ruta;
  console.group("🌐 Petición al backend");
  console.log("GET", url);
  const inicio = performance.now();
  try {
    for (let i = 1; i <= intentos; i++) {
      try {
        const resp = await fetch(url);
        // 502/503/504: el servidor gratuito de Render aún está despertando
        if ([502, 503, 504].includes(resp.status))
          throw new TypeError(`servidor no disponible (${resp.status})`);
        const data = await resp.json();
        console.log(
          `Estado: ${resp.status} (${Math.round(performance.now() - inicio)} ms)`,
        );
        console.log("Respuesta:", data);
        if (Array.isArray(data) && data.length)
          console.table(data.slice(0, 10)); // vista en tabla
        if (!resp.ok) throw new Error(data.error || "Error " + resp.status);
        return data;
      } catch (e) {
        // Los errores de red (TypeError) se reintentan; los demás se muestran de una vez
        if (e instanceof TypeError && i < intentos) {
          console.warn(
            `Intento ${i} de ${intentos} falló (${e.message}). Reintentando en 8 s...`,
          );
          mostrarEstado(
            "El servidor gratuito está despertando, puede tardar hasta un minuto...",
          );
          await new Promise((r) => setTimeout(r, 8000));
          continue;
        }
        throw e;
      }
    }
  } finally {
    console.groupEnd();
  }
}

function mostrarEstado(texto, esError = false) {
  $("estado").textContent = texto;
  $("estado").className = esError ? "error" : "";
}

// ---------- Foto con respaldo si la imagen no carga ----------
function crearFoto(plato) {
  const respaldo = () =>
    el("div", { class: "foto sin-foto", "aria-hidden": "true", text: "🍽️" });
  if (!plato.imagen) return respaldo();
  const img = el("img", {
    class: "foto",
    src: plato.imagen,
    alt: plato.nombre,
    loading: "lazy",
  });
  img.addEventListener("error", () => img.replaceWith(respaldo()));
  return img;
}

// ---------- Paso 1: regiones ----------
async function cargarRegiones() {
  mostrarEstado(
    "Cargando regiones... (si el servidor estaba dormido, puede tardar hasta un minuto)",
  );
  try {
    const regiones = await pedirJSON("/api/regiones");
    $("regiones").replaceChildren(
      ...regiones.map((r) =>
        el(
          "button",
          {
            class: "region",
            type: "button",
            "data-id": r.id,
            style: `--color: var(--r${r.id})`,
            onclick: () => elegirRegion(r),
          },
          el("h3", { text: r.nombre }),
          el("small", {
            text: `${r.departamentos} ${r.departamentos === 1 ? "departamento" : "departamentos"}`,
          }),
          el("p", { text: r.descripcion }),
        ),
      ),
    );
    mostrarEstado("");
  } catch (e) {
    console.error(e);
    mostrarEstado("No se pudieron cargar las regiones: " + e.message, true);
  }
}

// ---------- Paso 2: departamentos de la región ----------
async function elegirRegion(region) {
  document
    .querySelectorAll(".region")
    .forEach((b) => b.classList.toggle("activa", b.dataset.id == region.id));
  $("detalle").hidden = true;
  mostrarEstado(`Cargando departamentos de ${region.nombre}...`);
  try {
    const deptos = await pedirJSON(`/api/regiones/${region.id}/departamentos`);
    $("t-deptos").textContent =
      `2. Departamentos de la región ${region.nombre}`;
    $("departamentos").replaceChildren(
      ...deptos.map((d) =>
        el(
          "button",
          {
            class: "chip",
            type: "button",
            "data-id": d.id,
            style: `--color: var(--r${region.id})`,
            onclick: () => elegirDepartamento(d.id, region.id),
          },
          d.nombre,
        ),
      ),
    );
    $("sec-deptos").hidden = false;
    $("sec-deptos").scrollIntoView({ behavior: "smooth", block: "start" });
    mostrarEstado("");
  } catch (e) {
    console.error(e);
    mostrarEstado(
      "No se pudieron cargar los departamentos: " + e.message,
      true,
    );
  }
}

// ---------- Paso 3: detalle del departamento ----------
async function elegirDepartamento(id, regionId) {
  document
    .querySelectorAll("#departamentos .chip")
    .forEach((b) => b.classList.toggle("activa", b.dataset.id == id));
  mostrarEstado("Cargando departamento...");
  try {
    const d = await pedirJSON(`/api/departamentos/${id}`);
    pintarDetalle(d, regionId);
    mostrarEstado("");
    $("detalle").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    console.error(e);
    mostrarEstado("No se pudo cargar el departamento: " + e.message, true);
  }
}

function pintarDetalle(d, regionId) {
  const resumen =
    d.descripcion && d.descripcion.length > 360
      ? d.descripcion.slice(0, 360).trim() + "…"
      : d.descripcion;
  const dato = (etiqueta, valor) =>
    el("li", {}, el("b", { text: valor }), etiqueta);

  const platos = d.platos.length
    ? el(
        "div",
        { class: "platos" },
        d.platos.map((p) =>
          el(
            "button",
            {
              class: "plato",
              type: "button",
              onclick: () => abrirPlato(p, d.nombre),
            },
            crearFoto(p),
            el(
              "div",
              { class: "info" },
              el("h3", { text: p.nombre }),
              el("p", { text: p.descripcion }),
            ),
          ),
        ),
      )
    : el("p", {
        class: "vacio",
        text: "Aún no hay platos típicos registrados para este departamento.",
      });

  const lista = el("div", { class: "chips" });
  const pintarMunicipios = (texto = "") => {
    const t = texto.trim().toLowerCase();
    const visibles = d.municipios.filter((m) => m.toLowerCase().includes(t));
    lista.replaceChildren(
      ...visibles.map((m) => el("span", { class: "chip", text: m })),
    );
    contador.textContent = `${visibles.length} de ${d.municipios.length} municipios`;
  };
  const contador = el("p", { class: "vacio" });
  const filtro = el("input", {
    class: "filtro",
    type: "search",
    placeholder: "Buscar municipio...",
    "aria-label": "Buscar municipio",
    oninput: (e) => pintarMunicipios(e.target.value),
  });
  pintarMunicipios();

  $("detalle").style.setProperty("--color", `var(--r${regionId})`);
  $("detalle").replaceChildren(
    el(
      "div",
      { class: "cabecera-depto" },
      el("h2", { text: d.nombre }),
      el("p", { text: resumen }),
      el(
        "ul",
        { class: "datos" },
        dato("Capital", d.capital || "—"),
        dato("Población", fmt(d.poblacion)),
        dato("Superficie (km²)", fmt(d.superficie)),
        dato("Municipios", fmt(d.municipios.length)),
      ),
    ),
    el("h2", { text: "Platos típicos", style: "margin-top:28px" }),
    platos,
    el("h2", { text: "Municipios", style: "margin-top:32px" }),
    el("div", { class: "municipios" }, filtro, contador, lista),
  );
  $("detalle").hidden = false;
}

// ---------- Ventana del plato ----------
function abrirPlato(plato, departamento) {
  $("modal-contenido").replaceChildren(
    crearFoto(plato),
    el(
      "div",
      { class: "modal-cuerpo" },
      el("span", { class: "etiqueta", text: departamento }),
      el("h3", { text: plato.nombre }),
      el("p", { text: plato.descripcion }),
      el("span", { class: "etiqueta", text: "Ingredientes" }),
      el(
        "ul",
        { class: "ingredientes" },
        plato.ingredientes.map((i) => el("li", { text: i })),
      ),
      el("p", {
        class: "nota",
        text: "Preparación paso a paso: disponible en la próxima fase del proyecto.",
      }),
    ),
  );
  $("modal").showModal();
}

$("cerrar").addEventListener("click", () => $("modal").close());
$("modal").addEventListener("click", (e) => {
  if (e.target === $("modal")) $("modal").close();
});

cargarRegiones();
