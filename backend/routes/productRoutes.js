import express from 'express';
import { 
  registerProducts, 
  getProducts, 
  updateProduct, 
  deleteProduct 
} from '../controllers/productos/productosControllers.js'
import { subirImg } from '../middleware/subirImg.js';
import { verifyToken } from '../middleware/getToken.js';
import { getInventory, getAdminCatalog, createInventoryProduct, exportInventoryToCatalog, updateInventoryStock, updateInventoryStockByBarcode, assignInventoryBarcode, getInventoryProductByBarcode, deleteInventoryProduct } from '../controllers/productos/productosControllers.js';
import { requireAdmin, requirePermission } from '../middleware/rbac.js';

export const routerProductos = express.Router();

routerProductos.get('/admin/inventario', verifyToken, requirePermission('inventory:read'), getInventory);
routerProductos.get('/admin/catalogo', verifyToken, requirePermission('catalog:read'), getAdminCatalog);
routerProductos.post('/admin/inventario', verifyToken, requirePermission('inventory:write'), subirImg, createInventoryProduct);
routerProductos.patch('/admin/inventario/exportar-catalogo', verifyToken, requireAdmin, exportInventoryToCatalog);
routerProductos.get('/admin/inventario/codigo/:codigo', verifyToken, requirePermission('inventory:read'), getInventoryProductByBarcode);
routerProductos.patch('/admin/inventario/codigo/:codigo', verifyToken, requirePermission('inventory:write'), updateInventoryStockByBarcode);
routerProductos.patch('/admin/inventario/:id/codigo', verifyToken, requirePermission('inventory:write'), assignInventoryBarcode);
routerProductos.patch('/admin/inventario/:id/stock', verifyToken, requirePermission('inventory:write'), updateInventoryStock);
routerProductos.delete('/admin/inventario/:id', verifyToken, requirePermission('inventory:write'), deleteInventoryProduct);


routerProductos.get('/get-productos', getProducts); // Obtener todos
routerProductos.post('/registro-productos', verifyToken, requirePermission('catalog:write'), subirImg, registerProducts);
routerProductos.put('/productos/:id', verifyToken, requirePermission('catalog:write'), subirImg, updateProduct);
routerProductos.delete('/productos/:id', verifyToken, requirePermission('catalog:write'), deleteProduct);
