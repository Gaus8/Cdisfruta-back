import express from 'express';
subirImg
import { 
  registerProducts, 
  getProducts, 
  updateProduct, 
  deleteProduct 
} from '../controllers/productos/productosControllers.js'
import { subirImg } from '../middleware/subirImg.js';
import { verifyToken } from '../middleware/getToken.js';
import { getInventory, getAdminCatalog, createInventoryProduct, exportInventoryToCatalog, updateInventoryStock, updateInventoryStockByBarcode, assignInventoryBarcode, getInventoryProductByBarcode, deleteInventoryProduct } from '../controllers/productos/productosControllers.js';

export const routerProductos = express.Router();

const requireAdmin = (req, res, next) => {
  if (req.user?.rol !== 'admin') return res.status(403).json({ message: 'Solo administración puede gestionar el inventario.' });
  next();
};

routerProductos.get('/admin/inventario', verifyToken, requireAdmin, getInventory);
routerProductos.get('/admin/catalogo', verifyToken, requireAdmin, getAdminCatalog);
routerProductos.post('/admin/inventario', verifyToken, requireAdmin, subirImg, createInventoryProduct);
routerProductos.patch('/admin/inventario/exportar-catalogo', verifyToken, requireAdmin, exportInventoryToCatalog);
routerProductos.get('/admin/inventario/codigo/:codigo', verifyToken, requireAdmin, getInventoryProductByBarcode);
routerProductos.patch('/admin/inventario/codigo/:codigo', verifyToken, requireAdmin, updateInventoryStockByBarcode);
routerProductos.patch('/admin/inventario/:id/codigo', verifyToken, requireAdmin, assignInventoryBarcode);
routerProductos.patch('/admin/inventario/:id/stock', verifyToken, requireAdmin, updateInventoryStock);
routerProductos.delete('/admin/inventario/:id', verifyToken, requireAdmin, deleteInventoryProduct);


routerProductos.get('/get-productos', getProducts); // Obtener todos
routerProductos.post('/registro-productos',subirImg, registerProducts); // Crear
routerProductos.put('/productos/:id',subirImg, updateProduct); // Actualizar
routerProductos.delete('/productos/:id', deleteProduct); // Eliminar
