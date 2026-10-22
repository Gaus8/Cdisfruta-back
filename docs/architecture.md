# Arquitectura del backend

`app.js` conserva la inicialización de Express, CORS, middleware global y montaje de routers para cumplir con Vercel. Los routers se agrupan por dominio en `backend/routes` y mantienen sus paths actuales. La lógica HTTP reside en controladores por módulo; los esquemas Mongoose están en `backend/models`, las validaciones en `backend/validators` y los servicios externos en `backend/services`.

## Montaje de rutas

- `/api/auth`: autenticación, registro, perfil, administración de usuarios y roles.
- `/api`: catálogo/inventario, pedidos, notificaciones y portada.
- El frontend conserva `VITE_API_URL` como URL base, incluida su terminación `/api`.

La configuración de CORS y los paths de API se mantienen en `app.js` y los routers, respectivamente.
