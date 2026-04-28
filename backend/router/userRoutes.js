import express from 'express';
import { loginUser, verificarCuenta, googleLogin } from '../controllers/userController.js';
import { verifyToken } from '../middleware/getToken.js';
import { registrarUsuario } from '../controllers/usuarios/registrarUsuario.js';
export const routerRegister = express.Router();

routerRegister.post('/registro', registrarUsuario);

routerRegister.post('/login', loginUser);

routerRegister.post('/validacion', verificarCuenta);

routerRegister.get('/verify-token', verifyToken);

routerRegister.post('/auth/google', googleLogin);