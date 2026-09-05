import express from 'express';
import { 
  loginUser, 
  verificarCuenta, 
  actualizarPerfil, 
  actualizarAvatar, 
  solicitarCodigoPass, 
  cambiarPasswordSeguro 
} from '../controllers/userController.js';
import { verifyToken } from '../middleware/getToken.js';
import { registrarUsuario } from '../controllers/usuarios/registrarUsuario.js';
import { googleLogin } from '../controllers/usuarios/registrarUsuariosGoogle.js';

// Si usas multer para manejar la subida de imágenes a Cloudinary:
// import upload from '../middleware/uploadMiddleware.js'; 

export const routerUsuarios = express.Router();

routerUsuarios.post('/registro', registrarUsuario);
routerUsuarios.post('/login', loginUser);
routerUsuarios.post('/validacion', verificarCuenta);
routerUsuarios.get('/verify-token', verifyToken);
routerUsuarios.post('/auth/google', googleLogin);

// --- Rutas Protegidas de Configuración de Usuario ---
routerUsuarios.put('/actualizar-perfil', verifyToken, actualizarPerfil);
// Nota: Si usas multer para la imagen, añade el middleware de subida ej: verifyToken, upload.single('avatar'), actualizarAvatar
routerUsuarios.put('/actualizar-avatar', verifyToken, actualizarAvatar); 
routerUsuarios.post('/solicitar-codigo-pass', verifyToken, solicitarCodigoPass);
routerUsuarios.put('/cambiar-password-seguro', verifyToken, cambiarPasswordSeguro);