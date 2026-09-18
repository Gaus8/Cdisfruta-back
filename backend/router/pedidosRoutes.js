import express from 'express';
import { 
  crearPedido, 
  obtenerMisPedidos, 
  obtenerTodosLosPedidos, 
  actualizarEstadoPedido 
} from '../controllers/productos/pedidosControllers.js'; 
import { verificarTokenMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rutas con el prefijo /pedidos para que coincidan con /api/pedidos/...
router.post('/pedidos', verificarTokenMiddleware, crearPedido);                    
router.get('/pedidos/mis-pedidos', verificarTokenMiddleware, obtenerMisPedidos); 
router.get('/admin/pedidos', verificarTokenMiddleware, obtenerTodosLosPedidos);     
router.patch('/admin/pedidos/:id/estado', verificarTokenMiddleware, actualizarEstadoPedido); 
router.patch('/pedidos/:id/estado', verificarTokenMiddleware, actualizarEstadoPedido);

export default router;