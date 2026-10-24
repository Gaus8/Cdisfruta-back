# CDISFRUTA API

API de CDISFRUTA, la tienda de snacks de fruta deshidratada y aromáticas frutales de Ubaté, Cundinamarca. Este repositorio es el servidor. El sitio que lo consume está en [Cdisfruta-front](https://github.com/Gaus8/Cdisfruta-front).

En producción el front vive en `https://cdisfruta.vercel.app` y esta API en `https://cdisfruta-back.vercel.app`.

## Qué resuelve

El servidor guarda cuentas, catálogo, inventario, pedidos, pagos, notificaciones y las diapositivas del inicio. El front público, la tienda y el panel de administración hablan con estas rutas bajo `/api`.

La sesión viaja en la cookie `httpOnly` `access_token`. El mismo valor también se acepta como `Authorization: Bearer`. El login con correo deja la cookie 15 minutos. El ingreso con Google la deja 1 hora. En local la cookie es `SameSite=Lax`. Cuando `NODE_ENV` es `production` o el proceso corre en Vercel, la cookie es `Secure` y `SameSite=None` para que el front y la API, en dominios distintos, puedan compartirla.

## Funciones

### Cuentas y sesión

- Registro de cliente con nombre, correo, contraseña y aceptación de términos. El nombre llega como `name` y se guarda como `nombre`.
- Verificación por código de 6 dígitos enviado al correo. La cuenta no puede entrar hasta activarse.
- Registro después de una compra como invitado, usando el `claimToken` del pedido, y reenvío de ese código con un minuto de espera.
- Login con correo y contraseña, ingreso con el ID token del botón de Google, cierre de sesión y comprobación de la cookie.
- Recuperación de contraseña por enlace (15 minutos) y cambio de contraseña desde la sesión.
- Actualización de nombre, teléfono y avatar. La foto se sube en `PATCH /api/auth/actualizar-perfil`, campo `avatar`.

La contraseña pide de 8 a 16 caracteres, una mayúscula, una minúscula, un número y un símbolo de `.!@#$%^&*`.

### Roles

| Rol | Qué puede hacer |
| --- | --- |
| `admin` | Todo el panel: usuarios, pedidos, catálogo, inventario, portada, reportes y preferencias. |
| `user` | Tienda con sesión, sus pedidos, su perfil y el registro de actividad. |
| `logistica` | Inventario: `inventory:read` y `inventory:write`. |
| `catalogo` | Catálogo: `catalog:read` y `catalog:write`. |

Un administrador puede cambiar el rol de otra cuenta. No puede quitarse el rol a sí mismo y debe quedar al menos un administrador.

### Catálogo e inventario

- La tienda pública lista solo productos activos y publicados.
- El catálogo crea, edita y elimina productos con precio, descripción y hasta 5 imágenes JPG o PNG de 5 MB.
- El inventario crea artículos todavía sin publicar, ajusta stock, asigna código de barras y retira un artículo marcándolo inactivo.
- Exportar al catálogo pasa artículos a borrador. Siguen fuera de la tienda hasta completarlos y publicarlos.
- El stock de un pedido se descuenta al crearlo y se devuelve una sola vez si el cliente lo cancela, si administración lo cancela o si Wompi lo rechaza.

### Pedidos y pagos

- Cualquier visitante puede comprar. Con sesión el pedido queda a su nombre. Sin sesión el correo de envío es obligatorio y la respuesta incluye `guestClaimToken`.
- Medios de pago: `Contraentrega`, `NEQUI` y `CARD`. Los dos últimos arman el checkout de Wompi.
- El cliente ve sus pedidos y cancela uno propio solo si sigue en `Pendiente`, con un motivo.
- Una cuenta verificada puede reclamar un pedido de invitado si su correo coincide con el del envío.
- Administración lista todos los pedidos y los mueve entre `Pendiente`, `Comprobado`, `Enviado`, `Entregado` y `Cancelado`.
- Wompi avisa el resultado en `POST /api/pagos/wompi/webhook`. Esa ruta valida la firma del evento.

### Portada, avisos y analítica

- `GET /api/portada` devuelve las diapositivas del carrusel de inicio. Si no hay ninguna, crea las tres iniciales.
- Un administrador guarda de 1 a 12 diapositivas, con orden, textos e imagen. La foto se convierte a WebP. Se aceptan JPG, PNG, WebP, GIF, AVIF, BMP, TIFF y HEIC, hasta 8 MB.
- El panel recibe notificaciones de pedidos, inventario y catálogo. Se pueden marcar como leídas o borrar todas.
- La analítica resume pedidos, unidades, ingresos, visitas e interés por producto.
- El cliente puede registrar una visita a un producto o un intento de formulario, con un tope de 120 eventos por hora.

## Puesta en marcha

Requiere Node.js y una base MongoDB.

```sh
npm install
cp .env.example .env
npm run dev
```

`npm run dev` arranca `node --watch app.js` en el puerto `5000`. `npm start` arranca el mismo proceso sin recarga. `GET /` responde que el servidor está funcionando.

`npm run seeds` borra los usuarios de la base de desarrollo y crea dos cuentas locales ya verificadas: una de administración y una de cliente. El script se detiene si `NODE_ENV` es `production`. Las credenciales están en `seeds/seedsData.js`.

`npm test` ejecuta las pruebas de funcionalidad de la API con Vitest. Corren sobre una base MongoDB en memoria y no envían correos.

## Variables de entorno

Copia `.env.example` a `.env`. No subas ese archivo.

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto local. Por defecto `5000`. |
| `NODE_ENV` | `development` en local. En producción cambia la cookie de sesión. |
| `FRONTEND_URL` | Origen del front permitido en CORS. En local, `http://localhost:5173`. |
| `DB_CONNECTION_STRING` | URI de MongoDB. |
| `JWT_TOKEN` | Secreto con el que se firman las sesiones. |
| `EMAIL_USER` | Correo de Gmail que envía verificación y recuperación. |
| `EMAIL_PASSWORD` | Contraseña de aplicación de esa cuenta. |
| `GOOGLE_CLIENT_ID` | Cliente OAuth web. Debe ser el mismo ID que usa el botón del front. |
| `GOOGLE_CLIENT_SECRET` | Secreto de ese cliente. Solo vive en el servidor. |
| `WOMPI_PUBLIC_KEY` | Llave pública del checkout. |
| `WOMPI_PRIVATE_KEY` | Llave privada para consultar transacciones. |
| `WOMPI_INTEGRITY_SECRET` | Firma de la referencia de pago. |
| `WOMPI_EVENTS_SECRET` | Validación del webhook. |

En Google Cloud el cliente web necesita como origen de JavaScript `http://localhost:5173` y `https://cdisfruta.vercel.app`.

## Estructura

```
app.js                         entrada, CORS, cookie y montaje de routers
backend/config/database.js     conexión a MongoDB
backend/routes                 auth, productos, pedidos, notificaciones y portada
backend/controllers            lógica de cada módulo
backend/models                 User, producto, pedido, notificación, portada y actividad
backend/middlewares            token, permisos y subida a Cloudinary
backend/validators             esquemas Zod
backend/services               correo
backend/utils                  cookie de sesión y lectura del JWT
seeds                          usuarios locales de prueba
tests                          pruebas de funcionalidad de la API
docs                           colección de Postman
```

Los routers se montan así:

- `/api/auth` cuentas, perfil, roles y analítica
- `/api` productos, inventario, pedidos, notificaciones y portada
- `POST /api/logout` cierre de sesión, fuera del router de auth

## Documentación de la API

`docs/CDISFRUTA.postman_collection.json` describe los 50 endpoints montados, con el cuerpo de cada uno. En Postman se importa el archivo. `baseUrl` es solo el host, sin protocolo: en producción `cdisfruta-back.vercel.app` con `scheme` en `https`; en local `localhost:5000` con `scheme` en `http`.

`docs/openapi.yaml` es la misma API en OpenAPI 3. Fern importa este archivo. El JSON de Postman no es un spec de OpenAPI, por eso Fern lo rechaza.

Después de **Login Usuario** o **Ingreso con Google**, Postman guarda la cookie y la reenvía en las peticiones del mismo host.

## Despliegue

Vercel ejecuta `app.js` como función Node (`vercel.json`). El front de producción debe usar `VITE_API_URL=https://cdisfruta-back.vercel.app/api`. Las variables de esta tabla también tienen que existir en el proyecto de Vercel. Un cambio local no llega a producción hasta desplegarlo.
