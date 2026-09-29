import mongoose from 'mongoose';
import User from '../../schema/userSchema.js';
import UserActivity from '../../schema/userActivitySchema.js';
import Pedido from '../../schema/pedidoSchema.js';
import Producto from '../../schema/productsSchema.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const registeredAt = (user) => user.createdAt || user._id.getTimestamp();

const requireAdmin = (req, res) => {
  if (req.user?.rol === 'admin') return true;
  res.status(403).json({ message: 'Solo administración puede acceder a esta información.' });
  return false;
};

export const listarUsuariosAdmin = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = 10;
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

export const eliminarUsuariosAdmin = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 10) {
    return res.status(400).json({ message: 'Selecciona entre 1 y 10 cuentas de clientes.' });
  }
  const uniqueIds = [...new Set(ids.map(String))];
  if (uniqueIds.length !== ids.length || uniqueIds.some((id) => !mongoose.isValidObjectId(id))) {
    return res.status(400).json({ message: 'La selección contiene identificadores inválidos o repetidos.' });
  }
  if (uniqueIds.some((id) => id === String(req.user?.id))) {
    return res.status(403).json({ message: 'No puedes eliminar la cuenta que estás utilizando.' });
  }
  try {
    const users = await User.find({ _id: { $in: uniqueIds }, rol: 'user' }).select('_id');
    if (users.length !== uniqueIds.length) return res.status(404).json({ message: 'Una o más cuentas seleccionadas ya no existen o no son cuentas de cliente.' });
    const userIds = users.map((user) => user._id);
    await UserActivity.deleteMany({ usuario: { $in: userIds } });
    const result = await User.deleteMany({ _id: { $in: userIds }, rol: 'user' });
    if (result.deletedCount !== userIds.length) return res.status(409).json({ message: 'La selección cambió mientras se procesaba. Actualiza el listado e inténtalo de nuevo.' });
    return res.status(200).json({ message: 'Las cuentas seleccionadas fueron eliminadas.', eliminados: result.deletedCount });
  } catch (error) {
    console.error('Error al eliminar usuarios en lote:', error);
    return res.status(500).json({ message: 'No se pudieron eliminar las cuentas seleccionadas.' });
  }
};

export const obtenerAnaliticaProductosAdmin = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const confirmedStates = ['Comprobado', 'Enviado', 'Entregado'];
    const [catalog, orderMetrics, visitMetrics, interestMetrics] = await Promise.all([
      Producto.find({ activo: true, publicarEnTienda: { $ne: false } }).select('nombre categoria imagen precio').lean(),
      Pedido.aggregate([
        { $match: { estado: { $ne: 'Cancelado' } } },
        { $unwind: '$productos' },
        { $group: {
          _id: { $ifNull: ['$productos.productoId', '$productos.nombre'] },
          productoId: { $first: '$productos.productoId' },
          nombre: { $first: '$productos.nombre' },
          pedidos: { $sum: 1 },
          unidades: { $sum: { $ifNull: ['$productos.cantidad', { $ifNull: ['$productos.quantity', 0] }] } },
          ingresos: { $sum: { $cond: [{ $in: ['$estado', confirmedStates] }, { $multiply: [{ $ifNull: ['$productos.precio', 0] }, { $ifNull: ['$productos.cantidad', { $ifNull: ['$productos.quantity', 0] }] }] }, 0] } }
        } }
      ]),
      UserActivity.aggregate([
        { $match: { tipo: 'product_view', producto: { $ne: null } } },
        { $group: { _id: '$producto', nombre: { $first: '$nombreProducto' }, visitas: { $sum: 1 }, visitantes: { $addToSet: '$usuario' }, ultimaVisita: { $max: '$fecha' } } },
        { $project: { nombre: 1, visitas: 1, ultimaVisita: 1, visitantes: { $size: '$visitantes' } } }
      ]),
      UserActivity.aggregate([
        { $match: { tipo: 'form_attempt', producto: { $ne: null } } },
        { $group: { _id: '$producto', nombre: { $first: '$nombreProducto' }, intentosFormulario: { $sum: 1 }, intentosInteres: { $sum: { $cond: [{ $eq: ['$tipoFormulario', 'product_interest'] }, 1, 0] } }, usuariosInteres: { $addToSet: '$usuario' } } },
        { $project: { nombre: 1, intentosFormulario: 1, intentosInteres: 1, usuariosInteres: { $size: '$usuariosInteres' } } }
      ])
    ]);
    const metricsByProduct = new Map();
    const getMetrics = (id, name = 'Producto') => {
      const key = String(id || name);
      if (!metricsByProduct.has(key)) metricsByProduct.set(key, { productoId: id ? String(id) : null, nombre: name, categoria: '', imagen: '', precio: 0, pedidos: 0, unidades: 0, ingresos: 0, visitas: 0, visitantes: 0, intentosFormulario: 0, intentosInteres: 0, usuariosInteres: 0, ultimaVisita: null });
      return metricsByProduct.get(key);
    };
    catalog.forEach((product) => Object.assign(getMetrics(product._id, product.nombre), { categoria: product.categoria || '', imagen: product.imagen || '', precio: Number(product.precio || 0) }));
    orderMetrics.forEach((metric) => Object.assign(getMetrics(metric.productoId, metric.nombre), { pedidos: metric.pedidos, unidades: metric.unidades, ingresos: metric.ingresos }));
    visitMetrics.forEach((metric) => Object.assign(getMetrics(metric._id, metric.nombre), { visitas: metric.visitas, visitantes: metric.visitantes, ultimaVisita: metric.ultimaVisita }));
    interestMetrics.forEach((metric) => Object.assign(getMetrics(metric._id, metric.nombre), { intentosFormulario: metric.intentosFormulario, intentosInteres: metric.intentosInteres, usuariosInteres: metric.usuariosInteres }));
    const productos = [...metricsByProduct.values()].sort((a, b) => b.pedidos - a.pedidos || b.visitas - a.visitas || b.intentosInteres - a.intentosInteres);
    return res.status(200).json({ productos, resumen: {
      productosAnalizados: productos.length,
      unidadesVendidas: productos.reduce((sum, product) => sum + product.unidades, 0),
      visitasRegistradas: productos.reduce((sum, product) => sum + product.visitas, 0),
      intentosFormulario: productos.reduce((sum, product) => sum + product.intentosFormulario, 0),
      intentosInteres: productos.reduce((sum, product) => sum + product.intentosInteres, 0)
    } });
  } catch (error) {
    console.error('Error al consultar analítica de productos:', error);
    return res.status(500).json({ message: 'No se pudo cargar la analítica de productos.' });
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
      const product = await Producto.findOne({ _id: productoId, activo: true, publicarEnTienda: { $ne: false } }).select('nombre');
      if (!product) return res.status(404).json({ message: 'No se encontró el producto.' });
      await UserActivity.create({ usuario: req.user.id, tipo, producto: product._id, nombreProducto: product.nombre });
      return res.status(201).json({ registrado: true });
    }
    if (tipo === 'form_attempt' && ['cart', 'quote', 'product_interest'].includes(tipoFormulario)) {
      let productData = {};
      if (productoId) {
        if (!mongoose.isValidObjectId(productoId)) return res.status(400).json({ message: 'El producto asociado al formulario no es válido.' });
        const product = await Producto.findOne({ _id: productoId, activo: true, publicarEnTienda: { $ne: false } }).select('nombre');
        if (!product) return res.status(404).json({ message: 'No se encontró el producto asociado al formulario.' });
        productData = { producto: product._id, nombreProducto: product.nombre };
      } else if (tipoFormulario === 'product_interest') {
        return res.status(400).json({ message: 'El interés debe estar asociado a un producto válido.' });
      }
      await UserActivity.create({ usuario: req.user.id, tipo, tipoFormulario, ...productData });
      return res.status(201).json({ registrado: true });
    }
    return res.status(400).json({ message: 'El tipo de actividad no es compatible.' });
  } catch (error) {
    console.error('Error al registrar actividad del usuario:', error);
    return res.status(500).json({ message: 'No se pudo registrar la actividad.' });
  }
};
