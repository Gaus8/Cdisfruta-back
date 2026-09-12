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