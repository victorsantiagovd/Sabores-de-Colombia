# Sabores de Colombia

Página web que permite recorrer las regiones de Colombia a través de su gastronomía: se elige una región, luego un departamento, y se consultan sus **platos típicos** (con foto, descripción e ingredientes) y sus **municipios**.

Proyecto de la evidencia **GA2-220501096-AA2-EV03 – Consumo de API de terceros** (Tecnólogo en Análisis y Desarrollo de Software, SENA).

## API de terceros utilizada

[API Colombia](https://api-colombia.com) (gratuita, sin autenticación). Endpoints consumidos por el backend:

| Endpoint de API Colombia                      | Uso                               |
| --------------------------------------------- | --------------------------------- |
| `GET /api/v1/Region`                          | Lista de regiones                 |
| `GET /api/v1/Department` y `/Department/{id}` | Departamentos y su información    |
| `GET /api/v1/TypicalDish/{id}/department`     | Platos típicos de un departamento |
| `GET /api/v1/Department/{id}/cities`          | Municipios de un departamento     |
| `GET /api/v1/City/{id}`                       | Capital del departamento          |

## Tecnologías

- **Backend:** Node.js + Express (proxy con caché en memoria de una hora)
- **Frontend:** HTML, CSS y JavaScript (`fetch`, manipulación del DOM)

## Endpoints propios del backend

| Ruta                                  | Descripción                              |
| ------------------------------------- | ---------------------------------------- |
| `GET /api/regiones`                   | Regiones con su número de departamentos  |
| `GET /api/regiones/:id/departamentos` | Departamentos de una región              |
| `GET /api/departamentos/:id`          | Información, platos típicos y municipios |

## Estructura

```
server.js        Backend (Express)
package.json
docs/            Frontend (index.html, style.css, script.js)
```

La carpeta del frontend se llama `docs` para poder publicarla en GitHub Pages.

## Ejecutar en local

Requiere Node.js 18 o superior.

```bash
npm install
npm start
```

Luego abrir http://localhost:3000. Las peticiones se pueden ver en la consola del navegador (F12) y en la terminal del servidor.

## Despliegue

- **Backend (Render):** https://sabores-de-colombia-ulo3.onrender.com
- **Frontend (GitHub Pages):** https://victorsantiagovd.github.io/Sabores-de-Colombia/
- **Repositorio:** https://github.com/victorsantiagovd/Sabores-de-Colombia

## Nota

El backend está en un plan gratuito que se "duerme" tras 15 minutos sin uso, por lo que la primera carga puede tardar hasta un minuto.
