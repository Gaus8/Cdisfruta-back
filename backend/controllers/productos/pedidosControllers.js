import Pedido from '../../schema/pedidoSchema.js';
import Notificacion from '../../schema/notificacionSchema.js';

// 1. Crear un nuevo pedido (al finalizar compra)
export const crearPedido = async (req, res) => {
  try {
    // Tomamos el usuario de req.user (si hay token) o del body (usuario o usuarioId)
    const usuarioId = req.user?.id || req.body.usuario || req.body.usuarioId;
    const { productos, total, datosEnvio } = req.body;

    if (!usuarioId) {
      return res.status(400).json({ status: 'error', message: 'No se encontró el ID del usuario autenticado' });
    }

    if (!productos || productos.length === 0) {
      return res.status(400).json({ status: 'error', message: 'El carrito está vacío' });
    }

    if (!datosEnvio) {
      return res.status(400).json({ status: 'error', message: 'Faltan los datos de envío' });
    }

    const nuevoPedido = await Pedido.create({
      usuario: usuarioId,
      productos,
      total,
      datosEnvio,
      estado: 'Pendiente'
    });

    // Creamos una notificación para el panel de administración
    await Notificacion.create({
      mensaje: `Nuevo pedido recibido de ${datosEnvio.nombres} ${datosEnvio.apellidos} por un valor de $${total}`,
      tipo: 'creacion'
    });

    res.status(201).json({
      status: 'success',
      message: 'Pedido registrado con éxito',
      pedido: nuevoPedido
    });
  } catch (error) {
    console.error("Error al crear pedido:", error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 2. Obtener los pedidos del usuario autenticado ("Mis Pedidos")
export const obtenerMisPedidos = async (req, res) => {
  try {
    const usuarioId = req.user ? req.user.id : req.params.usuarioId;
    const pedidos = await Pedido.find({ usuario: usuarioId }).sort({ fechaCreacion: -1 });
    
    res.status(200).json(pedidos);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 3. Obtener todos los pedidos (para el panel de administración)
export const obtenerTodosLosPedidos = async (req, res) => {
  try {
    const pedidos = await Pedido.find()
      .populate('usuario', 'nombre correo') 
      .sort({ fechaCreacion: -1 });

    res.status(200).json(pedidos);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 4. Actualizar el estado del pedido (Para el Admin: Pendiente, Comprobado, Enviado, Entregado, Cancelado)
export const actualizarEstadoPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, motivo } = req.body;

    const estadosValidos = ['Pendiente', 'Comprobado', 'Enviado', 'Entregado', 'Cancelado'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ status: 'error', message: 'Estado no válido' });
    }

    const pedidoActualizado = await Pedido.findByIdAndUpdate(
      id,
      { estado },
      { new: true }
    );

    if (!pedidoActualizado) {
      return res.status(404).json({ status: 'error', message: 'Pedido no encontrado' });
    }

    res.status(200).json({
      status: 'success',
      message: `Estado actualizado a ${estado}`,
      pedido: pedidoActualizado
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};