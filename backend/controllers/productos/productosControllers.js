import Producto from '../../schema/productsSchema.js'
import Notificacion from '../../schema/notificacionSchema.js';
import mongoose from 'mongoose';

const notificarInventario = async (mensaje, tipo = 'inventario') => {
  try {
    await Notificacion.create({ mensaje, tipo, leido: false });
  } catch (error) {
    console.error('No se pudo registrar la notificación de inventario:', error.message);
  }
};

// Obtener todos los productos
export const getProducts = async (req, res) => {
  try {
    const productos = await Producto.find({ activo: true, publicarEnTienda: { $ne: false } });
    if (!productos || productos.length === 0) {
      return res.status(404).json({ message: "No hay productos registrados" });
    }
    res.status(200).json(productos);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener productos',
      error: error.message
    });
  }
};

// Crear producto con múltiples imágenes
export const registerProducts = async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoria, stock } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No se envió ninguna imagen" });
    }

    const imagenesUrls = req.files.map(file => file.path);

    const newProduct = {
      nombre,
      descripcion,
      precio: Number(precio), 
      categoria,
      stock: Number(stock),
      publicarEnTienda: true,
      imagen: imagenesUrls[0],
      imagenes: imagenesUrls
    };

    const createProduct = await Producto.create(newProduct);
    
    if (createProduct) {
      await Notificacion.create({ 
        mensaje: `Se añadió el producto: ${nombre}`,
        tipo: 'creacion'
      });

      res.status(201).json({
        status: 'success',
        message: 'Producto Creado',
        product: createProduct 
      });
    }
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Actualizar producto procesando imágenes existentes restantes y nuevas subidas
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, categoria, stock, imagenesExistentes } = req.body;

    const productoExistente = await Producto.findById(id);
    if (!productoExistente) {
      return res.status(404).json({ status: 'error', message: 'Producto no encontrado' });
    }

    // 1. Recolectamos las imágenes que el usuario decidió conservar
    let imagenesFinales = [];
    if (imagenesExistentes) {
      imagenesFinales = Array.isArray(imagenesExistentes) ? imagenesExistentes : [imagenesExistentes];
    }

    // 2. Si se subieron nuevas imágenes, las añadimos a la lista
    if (req.files && req.files.length > 0) {
      const nuevasUrls = req.files.map(file => file.path);
      imagenesFinales = [...imagenesFinales, ...nuevasUrls];
    }

    // Si por alguna razón no quedó ninguna, por seguridad conservamos las anteriores
    if (imagenesFinales.length === 0) {
      imagenesFinales = productoExistente.imagenes || [productoExistente.imagen].filter(Boolean);
    }

    // Límite de 5 y definición de la imagen principal
    imagenesFinales = imagenesFinales.slice(0, 5);
    const imagenPrincipal = imagenesFinales.length > 0 ? imagenesFinales[0] : '';

    const productoActualizado = await Producto.findByIdAndUpdate(
      id,
      { 
        nombre, 
        descripcion, 
        precio: Number(precio), 
        categoria, 
        stock: Number(stock), 
        imagen: imagenPrincipal,
        imagenes: imagenesFinales 
      },
      { new: true } 
    );

    await Notificacion.create({ 
      mensaje: `Se actualizó el producto: ${productoActualizado.nombre}`,
      tipo: 'edicion',
      leido: false
    });

    res.status(200).json({
      status: 'success',
      message: 'Producto actualizado con éxito',
      product: productoActualizado
    });

  } catch (error) {
    console.error("Error al actualizar producto:", error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Eliminar producto 
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const productoABorrar = await Producto.findById(id);
    const nombreProducto = productoABorrar ? productoABorrar.nombre : "Desconocido";

    const productoEliminado = await Producto.findByIdAndDelete(id);

    if (!productoEliminado) {
      return res.status(404).json({ status: 'error', message: 'Producto no encontrado' });
    }

    await Notificacion.create({ 
      mensaje: `Se eliminó el producto: ${nombreProducto}`,
      tipo: 'eliminacion'
    });

    res.status(200).json({
      status: 'success',
      message: 'Producto eliminado correctamente'
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error al eliminar producto',
      error: error.message
    });
  }
};

// Inventario administrativo: comparte los productos y existencias de la tienda.
export const getInventory = async (_req, res) => {
  try {
    const productos = await Producto.find({ activo: true }).sort({ fechaCreacion: -1 });
    res.status(200).json(productos);
  } catch (error) {
    res.status(500).json({ message: 'No se pudo cargar el inventario', error: error.message });
  }
};

export const createInventoryProduct = async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoria, stock, codigoBarras } = req.body;
    const publicarEnTienda = String(req.body.publicarEnTienda) === 'true';
    if (!nombre?.trim() || stock === undefined || (publicarEnTienda && (!descripcion?.trim() || !categoria?.trim() || precio === undefined))) {
      return res.status(400).json({ message: publicarEnTienda ? 'Completa los datos requeridos para publicar en la tienda.' : 'Completa el nombre y la cantidad del artículo.' });
    }
    if (!req.files?.length) return res.status(400).json({ message: 'Selecciona una foto del producto.' });
    const cantidad = Number(stock);
    const valor = Number(precio || 0);
    if (!Number.isInteger(cantidad) || cantidad < 0 || !Number.isFinite(valor) || valor < 0) {
      return res.status(400).json({ message: 'La cantidad debe ser un entero y el precio debe ser válido.' });
    }
    const fotos = req.files.map((file) => file.path);
    const product = await Producto.create({
      nombre: nombre.trim(), descripcion: descripcion?.trim() || '', categoria: categoria?.trim() || 'Materia prima',
      precio: valor, stock: cantidad, codigoBarras: codigoBarras?.trim() || undefined,
      imagen: fotos[0], imagenes: fotos, publicarEnTienda
    });
    await notificarInventario(
      `${publicarEnTienda ? 'Producto para tienda' : 'Insumo interno'} añadido: ${product.nombre} (${product.stock} unidades)`,
      'creacion_inventario'
    );
    res.status(201).json({ product });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Ese código de barras ya está asignado a otro producto.' });
    res.status(400).json({ message: error.message });
  }
};

export const updateInventoryStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock, delta } = req.body;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Producto inválido.' });
    let product;
    if (delta !== undefined) {
      const change = Number(delta);
      if (!Number.isInteger(change) || change === 0) return res.status(400).json({ message: 'Indica un ajuste entero distinto de cero.' });
      product = await Producto.findOneAndUpdate(
        { _id: id, activo: true, stock: { $gte: change < 0 ? Math.abs(change) : 0 } },
        { $inc: { stock: change } }, { new: true }
      );
    } else {
      const quantity = Number(stock);
      if (!Number.isInteger(quantity) || quantity < 0) return res.status(400).json({ message: 'La cantidad debe ser un entero igual o mayor que cero.' });
      product = await Producto.findOneAndUpdate({ _id: id, activo: true }, { $set: { stock: quantity } }, { new: true });
    }
    if (!product) return res.status(404).json({ message: 'Producto no encontrado o el ajuste supera las existencias.' });
    await notificarInventario(`Stock actualizado: ${product.nombre}. Ahora hay ${product.stock} unidades.`, 'ajuste_stock');
    res.status(200).json({ product });
  } catch (error) {
    res.status(500).json({ message: 'No se pudo actualizar el stock', error: error.message });
  }
};

export const updateInventoryStockByBarcode = async (req, res) => {
  try {
    const codigo = decodeURIComponent(req.params.codigo).trim();
    const { delta } = req.body;
    const change = Number(delta);
    if (!codigo || !Number.isInteger(change) || change === 0) return res.status(400).json({ message: 'Código o ajuste inválido.' });
    const product = await Producto.findOneAndUpdate(
      { codigoBarras: codigo, activo: true, stock: { $gte: change < 0 ? Math.abs(change) : 0 } },
      { $inc: { stock: change } }, { new: true }
    );
    if (!product) {
      const exists = await Producto.exists({ codigoBarras: codigo, activo: true });
      return res.status(exists ? 409 : 404).json({ message: exists ? 'El ajuste no puede dejar existencias negativas.' : 'No hay un producto activo con ese código de barras.' });
    }
    await notificarInventario(`Ingreso por código de barras: ${product.nombre}. Se ajustó el stock a ${product.stock} unidades.`, 'ajuste_stock');
    res.status(200).json({ product });
  } catch (error) {
    res.status(500).json({ message: 'No se pudo actualizar el stock', error: error.message });
  }
};

export const getInventoryProductByBarcode = async (req, res) => {
  try {
    const codigo = req.params.codigo.trim();
    const product = await Producto.findOne({ codigoBarras: codigo, activo: true });
    if (!product) return res.status(404).json({ message: 'Este código aún no está registrado.' });
    res.status(200).json({ product });
  } catch (error) {
    res.status(500).json({ message: 'No se pudo consultar el código de barras.', error: error.message });
  }
};

export const deleteInventoryProduct = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Producto inválido.' });
    const product = await Producto.findOneAndUpdate(
      { _id: req.params.id, activo: true },
      { $set: { activo: false } },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'El artículo no existe o ya fue retirado.' });
    await notificarInventario(`Artículo retirado del inventario: ${product.nombre}.`, 'eliminacion_inventario');
    res.status(200).json({ message: `${product.nombre} fue retirado del inventario.`, product });
  } catch (error) {
    res.status(500).json({ message: 'No se pudo retirar el artículo del inventario.', error: error.message });
  }
};

export const assignInventoryBarcode = async (req, res) => {
  try {
    const { id } = req.params;
    const codigoBarras = req.body.codigoBarras?.trim();
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Producto inválido.' });
    const change = codigoBarras ? { $set: { codigoBarras } } : { $unset: { codigoBarras: 1 } };
    const product = await Producto.findOneAndUpdate({ _id: id, activo: true }, change, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Producto no encontrado.' });
    res.status(200).json({ product });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Ese código de barras ya está asignado a otro producto.' });
    res.status(500).json({ message: 'No se pudo guardar el código de barras.', error: error.message });
  }
};
