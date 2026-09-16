import express from 'express';
import { 
  crearPedido, 
  obtenerMisPedidos, 
  obtenerTodosLosPedidos, 
  actualizarEstadoPedido 
} from '../controllers/productos/pedidosControllers.js'; 
import { verificarTokenMiddleware } from '../middleware/authMiddleware.js'; 

const router = express.Router();

// Rutas protegidas con verificación de token (inyectan req.user)
router.post('/pedidos', verificarTokenMiddleware, crearPedido);                    
router.get('/mis-pedidos', verificarTokenMiddleware, obtenerMisPedidos); 
router.get('/admin/pedidos', verificarTokenMiddleware, obtenerTodosLosPedidos);     
router.patch('/admin/pedidos/:id/estado', verificarTokenMiddleware, actualizarEstadoPedido); 

export default router;