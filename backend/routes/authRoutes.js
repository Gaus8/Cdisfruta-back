import express from 'express';
import { 
  loginUser, 
  verificarCuenta, 
  actualizarPerfil, 
  actualizarAvatar, 
  solicitarRestablecerPassword,
  restablecerPasswordConToken,
  cambiarPasswordDesdeApp, 
  obtenerPreferenciasAdmin,
  actualizarPreferenciasAdmin,
} from '../controllers/auth/authController.js';
import { verifyToken } from '../middlewares/getToken.js';
import { registrarUsuario, registrarUsuarioPostCompra, reenviarVerificacionPostCompra } from '../controllers/auth/registrationController.js';
import { googleLogin } from '../controllers/auth/googleAuthController.js';
import { subirAvatarPerfil } from '../middlewares/subirImg.js';
import { verificarTokenController } from '../controllers/auth/sessionController.js';
import {
  listarMisDirecciones,
  crearDireccionEnvio,
  actualizarDireccionEnvio,
  eliminarDireccionEnvio,
} from '../controllers/auth/direccionesController.js';
import { eliminarUsuarioAdmin, eliminarUsuariosAdmin, listarUsuariosAdmin, obtenerActividadUsuarioAdmin, obtenerAnaliticaProductosAdmin, registrarActividadUsuario } from '../controllers/admin/usersAdminController.js';
import { asignarRolUsuarioAdmin, listarAsignacionesRolesAdmin } from '../controllers/admin/usersAdminController.js';
import { requireAdmin, requirePermission } from '../middlewares/rbac.js';

// Si usas multer para manejar la subida de imágenes a Cloudinary:
// import upload from '../middlewares/uploadMiddleware.js';

export const routerUsuarios = express.Router();

routerUsuarios.post('/registro', registrarUsuario);
routerUsuarios.post('/registro-post-compra', registrarUsuarioPostCompra);
routerUsuarios.post('/reenviar-verificacion-post-compra', reenviarVerificacionPostCompra);
routerUsuarios.post('/login', loginUser);
routerUsuarios.post('/verificar-cuenta', verificarCuenta);
// Reemplazas tu función en línea por el controlador que consulta MongoDB
routerUsuarios.get('/verificar-token', verifyToken, verificarTokenController);
routerUsuarios.post('/google', googleLogin);
routerUsuarios.post('/codigo-password',solicitarRestablecerPassword);
routerUsuarios.post('/reset-password', restablecerPasswordConToken);
routerUsuarios.patch('/cambiar-password', verifyToken, cambiarPasswordDesdeApp);

routerUsuarios.patch('/actualizar-perfil', verifyToken, subirAvatarPerfil, actualizarPerfil);
routerUsuarios.get('/direcciones-envio', verifyToken, listarMisDirecciones);
routerUsuarios.post('/direcciones-envio', verifyToken, crearDireccionEnvio);
routerUsuarios.patch('/direcciones-envio/:id', verifyToken, actualizarDireccionEnvio);
routerUsuarios.delete('/direcciones-envio/:id', verifyToken, eliminarDireccionEnvio);
routerUsuarios.get('/admin/configuracion', verifyToken, requireAdmin, obtenerPreferenciasAdmin);
routerUsuarios.patch('/admin/configuracion', verifyToken, requireAdmin, actualizarPreferenciasAdmin);
routerUsuarios.get('/admin/usuarios', verifyToken, requireAdmin, listarUsuariosAdmin);
routerUsuarios.delete('/admin/usuarios', verifyToken, requireAdmin, eliminarUsuariosAdmin);
routerUsuarios.get('/admin/usuarios/:id/actividad', verifyToken, requireAdmin, obtenerActividadUsuarioAdmin);
routerUsuarios.delete('/admin/usuarios/:id', verifyToken, requireAdmin, eliminarUsuarioAdmin);
routerUsuarios.get('/admin/roles', verifyToken, requireAdmin, listarAsignacionesRolesAdmin);
routerUsuarios.patch('/admin/roles/:id', verifyToken, requireAdmin, asignarRolUsuarioAdmin);
routerUsuarios.get('/admin/analitica-productos', verifyToken, requirePermission('analytics:read'), obtenerAnaliticaProductosAdmin);
routerUsuarios.post('/actividad', verifyToken, registrarActividadUsuario);
routerUsuarios.put('/usuario/actualizar-avatar', verifyToken, subirAvatarPerfil, actualizarAvatar); 

