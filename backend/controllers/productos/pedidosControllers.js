import Pedido from '../../schema/pedidoSchema.js';
import Notificacion from '../../schema/notificacionSchema.js';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Producto from '../../schema/productsSchema.js';
import User from '../../schema/userSchema.js';

// 1. Crear un nuevo pedido (al finalizar compra)
export const crearPedido = async (req, res) => {
  try {
    // La identidad autenticada nunca se toma del cuerpo enviado por el navegador.
    const usuarioId = req.user?.id || null;
    const { productos, datosEnvio } = req.body;

    if (!Array.isArray(productos) || productos.length === 0 || productos.length > 50) {
      return res.status(400).json({ status: 'error', message: 'El carrito está vacío' });
    }

    if (!datosEnvio || !datosEnvio.nombres || !datosEnvio.apellidos || !datosEnvio.whatsapp || !datosEnvio.departamento || !datosEnvio.municipio || !datosEnvio.direccion || !datosEnvio.barrio) {
      return res.status(400).json({ status: 'error', message: 'Faltan los datos de envío' });
    }

    const email = String(datosEnvio.correo || '').trim().toLowerCase();
    if (!usuarioId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ status: 'error', message: 'Ingresa un correo válido para recibir la información del pedido.' });
    }
    const itemsValidos = productos.every((item) => mongoose.isValidObjectId(item?.productoId) && Number.isInteger(Number(item.cantidad)) && Number(item.cantidad) > 0 && Number(item.cantidad) <= 1000);
    if (!itemsValidos) {
      return res.status(400).json({ status: 'error', message: 'El detalle del pedido no es válido.' });
    }
    const productIds = [...new Set(productos.map((item) => String(item.productoId)))];
    const catalogProducts = await Producto.find({ _id: { $in: productIds }, activo: true, publicarEnTienda: { $ne: false } }).select('nombre precio stock imagen').lean();
    const productsById = new Map(catalogProducts.map((product) => [String(product._id), product]));
    if (productsById.size !== productIds.length) {
      return res.status(409).json({ status: 'error', message: 'Uno de los productos ya no está disponible en la tienda.' });
    }
    const requestedQuantities = new Map();
    productos.forEach((item) => {
      const id = String(item.productoId);
      requestedQuantities.set(id, (requestedQuantities.get(id) || 0) + Number(item.cantidad));
    });
    for (const [id, quantity] of requestedQuantities) {
      if (quantity > Number(productsById.get(id).stock || 0)) {
        return res.status(409).json({ status: 'error', message: `No hay existencias suficientes de ${productsById.get(id).nombre}.` });
      }
    }
    const productosValidados = productos.map((item) => {
      const product = productsById.get(String(item.productoId));
      return { productoId: product._id, nombre: product.nombre, precio: Number(product.precio || 0), cantidad: Number(item.cantidad), imagen: product.imagen || '' };
    });
    const totalCalculado = productosValidados.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    if (totalCalculado <= 0) return res.status(400).json({ status: 'error', message: 'El total del pedido debe ser mayor a cero.' });

    const guestClaimToken = usuarioId ? null : crypto.randomBytes(32).toString('base64url');
    const guestClaimTokenHash = guestClaimToken ? crypto.createHash('sha256').update(guestClaimToken).digest('hex') : undefined;

    const nuevoPedido = await Pedido.create({
      usuario: usuarioId,
      productos: productosValidados,
      total: totalCalculado,
      datosEnvio: { ...datosEnvio, correo: email },
      estado: 'Pendiente',
      ...(guestClaimTokenHash ? { guestClaimTokenHash, guestClaimExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } : {})
    });

    // Creamos una notificación para el panel de administración
    await Notificacion.create({
      mensaje: `Nuevo pedido recibido de ${datosEnvio.nombres} ${datosEnvio.apellidos} por un valor de $${totalCalculado}`,
      tipo: 'creacion'
    }).catch((notificationError) => console.error('No se pudo crear la notificación del pedido:', notificationError.message));

    res.status(201).json({
      status: 'success',
      message: 'Pedido registrado con éxito',
      pedido: { id: String(nuevoPedido._id), estado: nuevoPedido.estado, total: nuevoPedido.total, fechaCreacion: nuevoPedido.fechaCreacion, productos: nuevoPedido.productos },
      ...(guestClaimToken ? { guestClaimToken } : {})
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
      { returnDocument: 'after' }
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

export const reclamarPedidoInvitado = async (req, res) => {
  if (!req.user?.id || req.user.rol !== 'user') {
    return res.status(403).json({ status: 'error', message: 'Inicia sesión con una cuenta de cliente para asociar el pedido.' });
  }
  const claimToken = String(req.body?.claimToken || '');
  if (claimToken.length < 40 || claimToken.length > 100) {
    return res.status(400).json({ status: 'error', message: 'La referencia del pedido no es válida.' });
  }
  const claimHash = crypto.createHash('sha256').update(claimToken).digest('hex');
  try {
    const account = await User.findOne({ _id: req.user.id, rol: 'user', verificado: true }).select('email').lean();
    if (!account) return res.status(403).json({ status: 'error', message: 'La cuenta debe estar activa para asociar pedidos.' });
    const order = await Pedido.findOneAndUpdate({
      guestClaimTokenHash: claimHash,
      guestClaimExpiresAt: { $gt: new Date() },
      usuario: null,
      'datosEnvio.correo': String(account.email || '').trim().toLowerCase()
    }, { $set: { usuario: account._id }, $unset: { guestClaimTokenHash: 1, guestClaimExpiresAt: 1 } }, { returnDocument: 'after' }).select('_id');
    if (!order) return res.status(404).json({ status: 'error', message: 'El pedido expiró, ya fue asociado o no pertenece al correo de esta cuenta.' });
    return res.status(200).json({ status: 'success', message: 'El pedido quedó asociado a tu cuenta.', pedidoVinculado: String(order._id) });
  } catch (error) {
    console.error('Error al asociar pedido de invitado:', error);
    return res.status(500).json({ status: 'error', message: 'No se pudo asociar el pedido a la cuenta.' });
  }
};
