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

// Si usas multer para manejar la subida de imágenes a Cloudinary:
// import upload from '../middleware/uploadMiddleware.js'; 

export const routerUsuarios = express.Router();

routerUsuarios.post('/registro', registrarUsuario);
routerUsuarios.post('/login', loginUser);
routerUsuarios.post('/verificar-cuenta', verificarCuenta);
routerUsuarios.get('/verificar-token', verifyToken, (req, res) => {
  // Si verifyToken llamó a next(), significa que pasó el filtro y tenemos req.user
  return res.status(200).json({ 
    valid: true, 
    user: req.user, 
    message: 'Token válido' 
  });
});
routerUsuarios.post('/google', googleLogin);
routerUsuarios.post('/codigo-password',solicitarRestablecerPassword);
routerUsuarios.post('/reset-password', restablecerPasswordConToken);
routerUsuarios.patch('/cambiar-password', verifyToken, cambiarPasswordDesdeApp);

// --- Rutas Protegidas de Configuración de Usuario ---
routerUsuarios.put('/usuario/actualizar-perfil', verifyToken, actualizarPerfil);
// Nota: Si usas multer para la imagen, añade el middleware de subida ej: verifyToken, upload.single('avatar'), actualizarAvatar
routerUsuarios.put('/usuario/actualizar-avatar', verifyToken, actualizarAvatar); 

