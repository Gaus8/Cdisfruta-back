import express from 'express';
import { verifyToken } from '../middlewares/getToken.js';
import { requirePermission } from '../middlewares/rbac.js';
import { 
  obtenerNotificaciones, 
  marcarLeida, 
  borrarTodas 
} from '../controllers/notifications/notificationsController.js';

export const routerNotificaciones = express.Router();

// Obtener notificaciones no leídas
routerNotificaciones.get('/get-notificaciones', verifyToken, requirePermission('notifications:read'), obtenerNotificaciones);

// Marcar una como leída 
routerNotificaciones.patch('/notificaciones/:id', verifyToken, requirePermission('notifications:read'), marcarLeida);

// Todas leidas
routerNotificaciones.delete('/notificaciones-todas', verifyToken, requirePermission('notifications:read'), borrarTodas);
