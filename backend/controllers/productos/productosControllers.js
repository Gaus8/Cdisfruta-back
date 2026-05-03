import Producto from '../../schema/productsSchema.js'

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

// Crear producto
export const registerProducts = async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoria, stock } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: "No se envió ninguna imagen" });
    }

    const imagenUrl = req.file.path

    const newProduct = {
      nombre,
      descripcion,
      precio,
      categoria,
      stock,
      imagen:imagenUrl
    };

    const createProduct = await Producto.create(newProduct);
    if (createProduct) {
      res.status(201).json({
        status: 'success',
        message: 'Producto Creado',
        product: createProduct // Devuelve el producto creado
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: 'Fallo al crear'
      });
    }
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Actualizar producto
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, categoria, stock, imagen } = req.body;

    const productoActualizado = await Producto.findByIdAndUpdate(
      id,
      {
        nombre,
        descripcion,
        precio,
        categoria,
        stock,
        imagen
      },
      { new: true } // Devuelve el documento actualizado
    );

    if (!productoActualizado) {
      return res.status(404).json({
        status: 'error',
        message: 'Producto no encontrado'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Producto actualizado',
      product: productoActualizado
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error al actualizar producto',
      error: error.message
    });
  }
};

// Eliminar producto 
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const productoEliminado = await Producto.findByIdAndDelete(id);

    if (!productoEliminado) {
      return res.status(404).json({
        status: 'error',
        message: 'Producto no encontrado'
      });
    }

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