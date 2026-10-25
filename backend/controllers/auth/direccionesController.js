import User from '../../models/userSchema.js';
import {
  guardarDireccionEnvioUsuario,
  listarDireccionesUsuario,
  payloadDireccionEnvio,
  tieneDireccionEnvio,
  MAX_DIRECCIONES,
} from '../../utils/direccionEnvio.js';

export const listarMisDirecciones = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('direccionEnvio direccionesEnvio');
    if (!user) return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    return res.status(200).json({
      status: 'success',
      direccionesEnvio: listarDireccionesUsuario(user),
      direccionEnvio: payloadDireccionEnvio(user.direccionEnvio || {}),
    });
  } catch (error) {
    console.error('Error al listar direcciones:', error.message);
    return res.status(500).json({ status: 'error', message: 'No se pudieron cargar las direcciones.' });
  }
};

export const crearDireccionEnvio = async (req, res) => {
  try {
    const datos = payloadDireccionEnvio(req.body || {});
    if (!tieneDireccionEnvio(datos) || !datos.nombres || !datos.apellidos || !datos.whatsapp) {
      return res.status(400).json({
        status: 'error',
        message: 'Completa nombres, apellidos, WhatsApp, departamento, municipio, dirección y barrio.',
      });
    }

    const user = await User.findById(req.user.id).select('direccionesEnvio');
    if (!user) return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    if ((user.direccionesEnvio?.length || 0) >= MAX_DIRECCIONES) {
      const misma = (user.direccionesEnvio || []).some((item) =>
        item.direccion === datos.direccion
        && item.municipio === datos.municipio
        && item.departamento === datos.departamento
        && item.barrio === datos.barrio
      );
      if (!misma) {
        return res.status(400).json({
          status: 'error',
          message: `Puedes guardar hasta ${MAX_DIRECCIONES} direcciones. Elimina una para agregar otra.`,
        });
      }
    }

    const saved = await guardarDireccionEnvioUsuario(User, req.user.id, {
      ...datos,
      etiqueta: req.body?.etiqueta,
    }, { etiqueta: req.body?.etiqueta });

    return res.status(201).json({
      status: 'success',
      message: 'Dirección guardada. Ya puedes elegirla en el carrito.',
      direccion: saved.direccion,
      direccionEnvio: saved.direccionEnvio,
      direccionesEnvio: saved.direccionesEnvio,
    });
  } catch (error) {
    console.error('Error al crear dirección:', error.message);
    return res.status(500).json({ status: 'error', message: error.message || 'No se pudo guardar la dirección.' });
  }
};

export const actualizarDireccionEnvio = async (req, res) => {
  try {
    const { id } = req.params;
    const datos = payloadDireccionEnvio(req.body || {});
    if (!tieneDireccionEnvio(datos) || !datos.nombres || !datos.apellidos || !datos.whatsapp) {
      return res.status(400).json({
        status: 'error',
        message: 'Completa todos los datos de la dirección.',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });

    const index = (user.direccionesEnvio || []).findIndex((item) => String(item._id) === String(id));
    if (index < 0) {
      return res.status(404).json({ status: 'error', message: 'No encontramos esa dirección.' });
    }

    const etiqueta = String(req.body?.etiqueta || user.direccionesEnvio[index].etiqueta || 'Casa').trim() || 'Casa';
    user.direccionesEnvio[index] = {
      ...(user.direccionesEnvio[index].toObject?.() || user.direccionesEnvio[index]),
      ...datos,
      etiqueta,
    };
    user.direccionEnvio = datos;
    if (datos.whatsapp) user.telefono = datos.whatsapp;
    await user.save();

    return res.status(200).json({
      status: 'success',
      message: 'Dirección actualizada.',
      direccionEnvio: datos,
      direccionesEnvio: listarDireccionesUsuario(user),
    });
  } catch (error) {
    console.error('Error al actualizar dirección:', error.message);
    return res.status(500).json({ status: 'error', message: 'No se pudo actualizar la dirección.' });
  }
};

export const eliminarDireccionEnvio = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });

    const before = user.direccionesEnvio?.length || 0;
    user.direccionesEnvio = (user.direccionesEnvio || []).filter((item) => String(item._id) !== String(id));
    if (user.direccionesEnvio.length === before) {
      return res.status(404).json({ status: 'error', message: 'No encontramos esa dirección.' });
    }

    const siguiente = user.direccionesEnvio[0];
    user.direccionEnvio = siguiente
      ? payloadDireccionEnvio(siguiente)
      : {
        nombres: '', apellidos: '', whatsapp: '', departamento: '', municipio: '', direccion: '', barrio: '',
      };
    await user.save();

    return res.status(200).json({
      status: 'success',
      message: 'Dirección eliminada.',
      direccionEnvio: payloadDireccionEnvio(user.direccionEnvio || {}),
      direccionesEnvio: listarDireccionesUsuario(user),
    });
  } catch (error) {
    console.error('Error al eliminar dirección:', error.message);
    return res.status(500).json({ status: 'error', message: 'No se pudo eliminar la dirección.' });
  }
};
