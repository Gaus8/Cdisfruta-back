import express from 'express';
import { verifyToken } from '../middlewares/getToken.js';
import { requireAdmin } from '../middlewares/rbac.js';
import { 
  obtenerNotificaciones, 
  marcarLeida, 
  borrarTodas 
} from '../controllers/notifications/notificationsController.js';

export const routerNotificaciones = express.Router();

// Obtener notificaciones no leídas
routerNotificaciones.get('/get-notificaciones', verifyToken, requireAdmin, obtenerNotificaciones);

// Marcar una como leída 
routerNotificaciones.patch('/notificaciones/:id', verifyToken, requireAdmin, marcarLeida);

// Todas leidas
routerNotificaciones.delete('/notificaciones-todas', verifyToken, requireAdmin, borrarTodas);
