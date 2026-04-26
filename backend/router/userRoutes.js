import express from 'express';
import { loginUser, verificarCuenta } from '../controllers/userController.js';
import { verifyToken } from '../middleware/getToken.js';
import { registrarUsuario } from '../controllers/usuarios/registrarUsuario.js';
export const routerRegister = express.Router();

routerRegister.post('/registro', registrarUsuario);

routerRegister.post('/login', loginUser);

routerRegister.get('/validacion/:token', verificarCuenta);

routerRegister.get('/verify-token', verifyToken);