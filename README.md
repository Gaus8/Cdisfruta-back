# CDISFRUTA API

API Express 5 con MongoDB/Mongoose. La entrada pública continúa en `app.js` para conservar los comandos y el despliegue de Vercel.

## Estructura

- `backend/config`: conexión e infraestructura.
- `backend/routes`: routers Express, montados bajo `/api` desde `app.js`.
- `backend/controllers`: controladores agrupados por módulo.
- `backend/services`: servicios externos compartidos, como correo.
- `backend/models`: modelos Mongoose.
- `backend/middlewares`: autenticación, permisos y carga de imágenes.
- `backend/validators`: esquemas de validación.
- `backend/config/database.js`: conexión a MongoDB.
- `seeds/`: datos iniciales.
- `docs/`: documentación funcional y técnica.

## Comandos

- `npm run dev`: servidor con reinicio al cambiar archivos.
- `npm start`: servidor de producción.
- `npm run seeds`: carga los datos de inicio.

## Variables de entorno

Copia `.env.example` a `.env` y configura MongoDB, JWT, correo, OAuth y Wompi según el entorno. No guardes valores secretos en el repositorio. El frontend usa `VITE_API_URL` con el prefijo `/api`; las rutas y contratos existentes no cambian.

El script `npm test` todavía es un placeholder y no ejecuta pruebas.
