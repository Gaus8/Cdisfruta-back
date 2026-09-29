import mongoose from 'mongoose';
import User from '../../schema/userSchema.js';
import UserActivity from '../../schema/userActivitySchema.js';
import Pedido from '../../schema/pedidoSchema.js';
import Producto from '../../schema/productsSchema.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const registeredAt = (user) => user.createdAt || user._id.getTimestamp();

const requireAdmin = (req, res) => {
  if (req.user?.rol === 'admin') return true;
  res.status(403).json({ message: 'Solo administración puede gestionar usuarios.' });
  return false;
};

export const listarUsuariosAdmin = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const search = String(req.query.search || '').trim().slice(0, 120);
    const status = String(req.query.status || 'all');
    const filter = { rol: 'user' };
    if (search) {
      const matcher = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ nombre: matcher }, { email: matcher }];
    }
    if (status === 'active') filter.verificado = true;
    if (status === 'pending') filter.verificado = { $ne: true };

    const [records, total, totals] = await Promise.all([
      User.find(filter).select('nombre email verificado createdAt _id').sort({ _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(filter),
      User.aggregate([{ $match: { rol: 'user' } }, { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$verificado', true] }, 1, 0] } } } }])
    ]);
    const stats = totals[0] || { total: 0, active: 0 };
    return res.status(200).json({
      usuarios: records.map((user) => ({
        id: String(user._id),
        nombre: user.nombre,
        correo: user.email,
        fechaRegistro: registeredAt(user),
        estado: user.verificado ? 'active' : 'pending'
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      resumen: { total: stats.total, activos: stats.active, pendientes: stats.total - stats.active }
    });
  } catch (error) {
    console.error('Error al listar usuarios administrativos:', error);
    return res.status(500).json({ message: 'No se pudo cargar el listado de usuarios.' });
  }
};

export const obtenerActividadUsuarioAdmin = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'El identificador de usuario no es válido.' });
  try {
    const user = await User.findOne({ _id: id, rol: 'user' }).select('nombre email telefono avatar verificado createdAt _id').lean();
    if (!user) return res.status(404).json({ message: 'No se encontró el usuario.' });
    const [events, orders, orderCount, statusCounts, frequentProducts, formMetrics, eventCount] = await Promise.all([
      UserActivity.find({ usuario: user._id }).sort({ fecha: -1 }).limit(100).select('tipo producto nombreProducto tipoFormulario fecha').lean(),
      Pedido.find({ usuario: user._id }).sort({ fechaCreacion: -1 }).limit(10).select('estado total fechaCreacion').lean(),
      Pedido.countDocuments({ usuario: user._id }),
      Pedido.aggregate([{ $match: { usuario: user._id } }, { $group: { _id: '$estado', cantidad: { $sum: 1 } } }]),
      UserActivity.aggregate([
        { $match: { usuario: user._id, tipo: 'product_view' } },
        { $sort: { fecha: -1 } },
        { $group: { _id: { $ifNull: ['$producto', '$nombreProducto'] }, producto: { $first: '$producto' }, nombre: { $first: '$nombreProducto' }, visitas: { $sum: 1 }, ultimaVisita: { $max: '$fecha' } } },
        { $sort: { visitas: -1, ultimaVisita: -1 } },
        { $limit: 5 }
      ]),
      UserActivity.aggregate([
        { $match: { usuario: user._id, tipo: 'form_attempt' } },
        { $group: { _id: '$tipoFormulario', cantidad: { $sum: 1 } } }
      ]),
      UserActivity.countDocuments({ usuario: user._id })
    ]);

    const formAttempts = { cart: 0, quote: 0, product_interest: 0 };
    events.forEach((event) => {
      if (event.tipo === 'form_attempt' && Object.prototype.hasOwnProperty.call(formAttempts, event.tipoFormulario)) formAttempts[event.tipoFormulario] += 1;
    });
    formMetrics.forEach((metric) => {
      if (Object.prototype.hasOwnProperty.call(formAttempts, metric._id)) formAttempts[metric._id] = metric.cantidad;
    });

    const timeline = [
      ...events.map((event) => ({
        id: String(event._id),
        tipo: event.tipo,
        fecha: event.fecha,
        titulo: event.tipo === 'product_view' ? 'Visitó un producto' : 'Intentó completar un formulario',
        detalle: event.tipo === 'product_view' ? event.nombreProducto || 'Producto' : ({ cart: 'Carrito', quote: 'Cotización', product_interest: 'Interés en producto' }[event.tipoFormulario] || 'Formulario')
      })),
      ...orders.map((order) => ({
        id: `order-${order._id}`,
        tipo: 'order',
        fecha: order.fechaCreacion,
        titulo: 'Realizó un pedido',
        detalle: `${order.estado} · $${Number(order.total || 0).toLocaleString('es-CO')}`
      }))
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 30);

    return res.status(200).json({
      usuario: {
        id: String(user._id), nombre: user.nombre, correo: user.email, telefono: user.telefono || '', avatar: user.avatar || '',
        fechaRegistro: registeredAt(user), estado: user.verificado ? 'active' : 'pending'
      },
      analitica: {
        disponible: eventCount > 0,
        eventosRegistrados: eventCount,
        productosFrecuentes: frequentProducts.map((product) => ({ productoId: product.producto ? String(product.producto) : null, nombre: product.nombre || 'Producto', visitas: product.visitas, ultimaVisita: product.ultimaVisita })),
        intentosFormulario: formAttempts,
        pedidos: { total: orderCount, porEstado: Object.fromEntries(statusCounts.map((item) => [item._id, item.cantidad])), recientes: orders.map((order) => ({ id: String(order._id), estado: order.estado, total: order.total, fecha: order.fechaCreacion })) },
        actividadReciente: timeline
      }
    });
  } catch (error) {
    console.error('Error al consultar actividad de usuario:', error);
    return res.status(500).json({ message: 'No se pudo cargar la actividad del usuario.' });
  }
};

export const eliminarUsuarioAdmin = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'El identificador de usuario no es válido.' });
  if (String(req.user?.id) === String(id)) return res.status(403).json({ message: 'No puedes eliminar la cuenta que estás utilizando.' });
  try {
    const user = await User.findOne({ _id: id, rol: 'user' }).select('_id');
    if (!user) return res.status(404).json({ message: 'No se encontró una cuenta de cliente para eliminar.' });
    await UserActivity.deleteMany({ usuario: user._id });
    await User.deleteOne({ _id: user._id, rol: 'user' });
    return res.status(200).json({ message: 'La cuenta se eliminó correctamente.' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return res.status(500).json({ message: 'No se pudo eliminar la cuenta.' });
  }
};

export const registrarActividadUsuario = async (req, res) => {
  if (!req.user?.id || req.user.rol !== 'user') return res.status(403).json({ message: 'Esta actividad solo puede registrarse para una cuenta de cliente.' });
  const { tipo, productoId, tipoFormulario } = req.body || {};
  try {
    const userExists = await User.exists({ _id: req.user.id, rol: 'user' });
    if (!userExists) return res.status(404).json({ message: 'No se encontró la cuenta del cliente.' });
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await UserActivity.countDocuments({ usuario: req.user.id, fecha: { $gte: hourAgo } });
    if (recentCount >= 120) return res.status(429).json({ message: 'Se alcanzó el límite temporal de registro de actividad.' });
    if (tipo === 'product_view') {
      if (!mongoose.isValidObjectId(productoId)) return res.status(400).json({ message: 'Se requiere un producto válido para registrar la visita.' });
      const product = await Producto.findOne({ _id: productoId, activo: true }).select('nombre');
      if (!product) return res.status(404).json({ message: 'No se encontró el producto.' });
      await UserActivity.create({ usuario: req.user.id, tipo, producto: product._id, nombreProducto: product.nombre });
      return res.status(201).json({ registrado: true });
    }
    if (tipo === 'form_attempt' && ['cart', 'quote', 'product_interest'].includes(tipoFormulario)) {
      await UserActivity.create({ usuario: req.user.id, tipo, tipoFormulario });
      return res.status(201).json({ registrado: true });
    }
    return res.status(400).json({ message: 'El tipo de actividad no es compatible.' });
  } catch (error) {
    console.error('Error al registrar actividad del usuario:', error);
    return res.status(500).json({ message: 'No se pudo registrar la actividad.' });
  }
};
