import express from 'express';
import { verifyToken } from '../middleware/getToken.js';
import { requireAdmin } from '../middleware/rbac.js';
import { 
  obtenerNotificaciones, 
  marcarLeida, 
  borrarTodas 
} from '../controllers/productos/notificacionesControllers.js';

export const routerNotificaciones = express.Router();

// Obtener notificaciones no leídas
routerNotificaciones.get('/get-notificaciones', verifyToken, requireAdmin, obtenerNotificaciones);

// Marcar una como leída 
routerNotificaciones.patch('/notificaciones/:id', verifyToken, requireAdmin, marcarLeida);

// Todas leidas
routerNotificaciones.delete('/notificaciones-todas', verifyToken, requireAdmin, borrarTodas);
