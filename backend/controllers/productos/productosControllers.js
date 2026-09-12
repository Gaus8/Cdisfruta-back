import Producto from '../../schema/productsSchema.js'
import Notificacion from '../../schema/notificacionSchema.js';

// Obtener todos los productos
export const getProducts = async (req, res) => {
  try {
    const productos = await Producto.find({ activo: true });
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
    
    // Verificamos si se enviaron archivos en req.files
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No se envió ninguna imagen" });
    }

    // Mapeamos las URLs de Cloudinary de todos los archivos subidos
    const imagenesUrls = req.files.map(file => file.path);

    const newProduct = {
      nombre,
      descripcion,
      precio: Number(precio), 
      categoria,
      stock: Number(stock),
      imagen: imagenesUrls[0], // Primera imagen como principal (por compatibilidad)
      imagenes: imagenesUrls     // Array completo de imágenes para la galería
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

// Actualizar producto con soporte para múltiples imágenes
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, categoria, stock } = req.body;

    // Buscamos el producto actual para conservar las imágenes si no se envían nuevas
    const productoExistente = await Producto.findById(id);
    if (!productoExistente) {
      return res.status(404).json({ status: 'error', message: 'Producto no encontrado' });
    }

    let imagenesActualizadas = productoExistente.imagenes || [];

    // Si el usuario subió nuevas imágenes desde el admin, las agregamos o reemplazamos
    if (req.files && req.files.length > 0) {
      const nuevasUrls = req.files.map(file => file.path);
      // Puedes elegir si quieres reemplazar todas o concatenarlas. 
      // Lo ideal al editar por galería completa es reemplazar por las nuevas seleccionadas:
      imagenesActualizadas = nuevasUrls;
    }

    const imagenPrincipal = imagenesActualizadas.length > 0 ? imagenesActualizadas[0] : productoExistente.imagen;

    const productoActualizado = await Producto.findByIdAndUpdate(
      id,
      { 
        nombre, 
        descripcion, 
        precio, 
        categoria, 
        stock, 
        imagen: imagenPrincipal,
        imagenes: imagenesActualizadas 
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