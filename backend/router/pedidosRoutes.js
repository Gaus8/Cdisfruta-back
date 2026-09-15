import express from 'express';
import { 
  crearPedido, 
  obtenerMisPedidos, 
  obtenerTodosLosPedidos, 
  actualizarEstadoPedido 
} from '../controllers/productos/pedidosControllers.js'; 

const router = express.Router();

router.post('/pedidos', crearPedido);                    // Crear pedido al comprar
router.get('/mis-pedidos/:usuarioId', obtenerMisPedidos); // Ver historial del usuario
router.get('/admin/pedidos', obtenerTodosLosPedidos);     // Ver todos los pedidos (Admin)
router.put('/admin/pedidos/:id/estado', actualizarEstadoPedido); // Cambiar estado (Admin)

export default router;