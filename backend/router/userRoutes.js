import express from 'express';
import { 
  loginUser, 
  verificarCuenta, 
  actualizarPerfil, 
  actualizarAvatar, 
  solicitarRestablecerPassword,
  restablecerPasswordConToken,
  cambiarPasswordDesdeApp, 
} from '../controllers/usuarios/userController.js';
import { verifyToken } from '../middleware/getToken.js';
import { registrarUsuario } from '../controllers/usuarios/registrarUsuario.js';
import { googleLogin } from '../controllers/usuarios/registrarUsuariosGoogle.js';
import { subirAvatarPerfil } from '../middleware/subirImg.js';
import { verificarTokenController } from '../models/authUser.js';

// Si usas multer para manejar la subida de imágenes a Cloudinary:
// import upload from '../middleware/uploadMiddleware.js'; 

export const routerUsuarios = express.Router();

routerUsuarios.post('/registro', registrarUsuario);
routerUsuarios.post('/login', loginUser);
routerUsuarios.post('/verificar-cuenta', verificarCuenta);
// Reemplazas tu función en línea por el controlador que consulta MongoDB
routerUsuarios.get('/verificar-token', verifyToken, verificarTokenController);
routerUsuarios.post('/google', googleLogin);
routerUsuarios.post('/codigo-password',solicitarRestablecerPassword);
routerUsuarios.post('/reset-password', restablecerPasswordConToken);
routerUsuarios.patch('/cambiar-password', verifyToken, cambiarPasswordDesdeApp);

routerUsuarios.patch('/actualizar-perfil', verifyToken, subirAvatarPerfil, actualizarPerfil);
// Nota: Si usas multer para la imagen, añade el middleware de subida ej: verifyToken, upload.single('avatar'), actualizarAvatar
routerUsuarios.put('/usuario/actualizar-avatar', verifyToken, actualizarAvatar); 

