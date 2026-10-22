import express from 'express';
import { 
  crearPedido, 
  reclamarPedidoInvitado,
  obtenerMisPedidos, 
  obtenerTodosLosPedidos, 
  actualizarEstadoPedido,
  webhookWompi,
  consultarEstadoPagoWompi
} from '../controllers/orders/ordersController.js';
import { verificarTokenMiddleware } from '../middlewares/authMiddleware.js';
import { optionalAuthMiddleware } from '../middlewares/optionalAuthMiddleware.js';
import { requireAdmin } from '../middlewares/rbac.js';

const router = express.Router();

// Rutas con el prefijo /pedidos para que coincidan con /api/pedidos/...
router.post('/pedidos', optionalAuthMiddleware, crearPedido);                    
router.post('/pagos/wompi/webhook', webhookWompi);
router.get('/pedidos/estado-pago', consultarEstadoPagoWompi);
router.post('/pedidos/reclamar', verificarTokenMiddleware, reclamarPedidoInvitado);
router.get('/pedidos/mis-pedidos', verificarTokenMiddleware, obtenerMisPedidos); 
router.get('/admin/pedidos', verificarTokenMiddleware, requireAdmin, obtenerTodosLosPedidos);
router.patch('/admin/pedidos/:id/estado', verificarTokenMiddleware, requireAdmin, actualizarEstadoPedido);
// Legacy alias: mantenerlo también bajo el mismo control estricto del panel.
router.patch('/pedidos/:id/estado', verificarTokenMiddleware, requireAdmin, actualizarEstadoPedido);

export default router;
