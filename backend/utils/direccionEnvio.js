/** Normaliza y persiste las direcciones de entrega del cliente. */

const MAX_DIRECCIONES = 5;

export const payloadDireccionEnvio = (datosEnvio = {}) => ({
  nombres: String(datosEnvio.nombres || '').trim(),
  apellidos: String(datosEnvio.apellidos || '').trim(),
  whatsapp: String(datosEnvio.whatsapp || '').trim(),
  departamento: String(datosEnvio.departamento || '').trim(),
  municipio: String(datosEnvio.municipio || '').trim(),
  direccion: String(datosEnvio.direccion || '').trim(),
  barrio: String(datosEnvio.barrio || '').trim(),
});

export const tieneDireccionEnvio = (datos) => {
  if (!datos || typeof datos !== 'object') return false;
  return Boolean(
    datos.direccion
    || datos.municipio
    || datos.departamento
    || datos.whatsapp
    || datos.barrio
  );
};

const mismaDireccion = (a, b) => {
  const x = payloadDireccionEnvio(a);
  const y = payloadDireccionEnvio(b);
  return x.direccion === y.direccion
    && x.municipio === y.municipio
    && x.departamento === y.departamento
    && x.barrio === y.barrio
    && x.whatsapp === y.whatsapp;
};

export const serializarDireccion = (doc) => {
  if (!doc) return null;
  const base = payloadDireccionEnvio(doc);
  if (!tieneDireccionEnvio(base)) return null;
  return {
    id: String(doc._id || doc.id || 'principal'),
    etiqueta: String(doc.etiqueta || 'Dirección').trim() || 'Dirección',
    ...base,
  };
};

/** Lista lista para el front (incluye fallback de direccionEnvio legacy). */
export const listarDireccionesUsuario = (user) => {
  const fromArray = (Array.isArray(user?.direccionesEnvio) ? user.direccionesEnvio : [])
    .map(serializarDireccion)
    .filter(Boolean);

  if (fromArray.length) return fromArray;

  const legacy = serializarDireccion({
    _id: 'principal',
    etiqueta: 'Principal',
    ...(user?.direccionEnvio || {}),
  });
  return legacy ? [legacy] : [];
};

/**
 * Guarda/actualiza una dirección en la lista del usuario y la marca como predeterminada.
 * Si ya existe una igual, la reutiliza; si no, agrega (máx. 5).
 */
export async function guardarDireccionEnvioUsuario(User, usuarioId, datosEnvio, { etiqueta } = {}) {
  const direccionEnvio = payloadDireccionEnvio(datosEnvio);
  if (!tieneDireccionEnvio(direccionEnvio)) {
    throw new Error('La dirección de envío está incompleta.');
  }

  const user = await User.findById(usuarioId);
  if (!user) throw new Error('Usuario no encontrado');

  const label = String(etiqueta || datosEnvio.etiqueta || 'Casa').trim() || 'Casa';
  const lista = Array.isArray(user.direccionesEnvio) ? [...user.direccionesEnvio] : [];

  let matchIndex = lista.findIndex((item) => mismaDireccion(item, direccionEnvio));
  if (matchIndex < 0 && tieneDireccionEnvio(user.direccionEnvio) && mismaDireccion(user.direccionEnvio, direccionEnvio) && lista.length === 0) {
    // Migración suave: primera vez que pasamos de un solo campo a lista.
  }

  if (matchIndex >= 0) {
    const prev = lista[matchIndex].toObject ? lista[matchIndex].toObject() : { ...lista[matchIndex] };
    lista[matchIndex] = { ...prev, ...direccionEnvio, etiqueta: label };
  } else {
    if (lista.length >= MAX_DIRECCIONES) {
      // Reemplaza la más antigua para no bloquear la compra.
      lista.shift();
    }
    lista.push({ ...direccionEnvio, etiqueta: label });
  }

  // Si no había lista pero sí direccionEnvio distinta, conserva la anterior.
  if (
    lista.length === 1
    && tieneDireccionEnvio(user.direccionEnvio)
    && !mismaDireccion(user.direccionEnvio, direccionEnvio)
  ) {
    const legacy = payloadDireccionEnvio(user.direccionEnvio);
    if (tieneDireccionEnvio(legacy) && lista.length < MAX_DIRECCIONES) {
      lista.unshift({ ...legacy, etiqueta: 'Principal' });
    }
  }

  user.direccionesEnvio = lista;
  user.direccionEnvio = direccionEnvio;
  if (direccionEnvio.whatsapp) user.telefono = direccionEnvio.whatsapp;
  await user.save();

  const guardada = lista.find((item) => mismaDireccion(item, direccionEnvio)) || lista[lista.length - 1];
  return {
    direccionEnvio,
    direccion: serializarDireccion(guardada),
    direccionesEnvio: listarDireccionesUsuario(user),
  };
}

/** Si el perfil no tiene dirección, la recupera del último pedido y la guarda. */
export async function asegurarDireccionEnvio(User, Pedido, user) {
  if (!user?._id) {
    return { direccionEnvio: {}, direccionesEnvio: [] };
  }

  const existentes = listarDireccionesUsuario(user);
  if (existentes.length) {
    const principal = existentes.find((d) => mismaDireccion(d, user.direccionEnvio)) || existentes[0];
    return {
      direccionEnvio: payloadDireccionEnvio(principal),
      direccionesEnvio: existentes,
    };
  }

  const ultimo = await Pedido.findOne({ usuario: user._id })
    .sort({ fechaCreacion: -1 })
    .select('datosEnvio')
    .lean();

  if (!tieneDireccionEnvio(ultimo?.datosEnvio)) {
    return { direccionEnvio: {}, direccionesEnvio: [] };
  }

  try {
    const saved = await guardarDireccionEnvioUsuario(User, user._id, ultimo.datosEnvio, { etiqueta: 'Principal' });
    return {
      direccionEnvio: saved.direccionEnvio,
      direccionesEnvio: saved.direccionesEnvio,
    };
  } catch (error) {
    console.error('No se pudo hidratar la dirección de envío:', error.message);
    const fallback = payloadDireccionEnvio(ultimo.datosEnvio);
    return {
      direccionEnvio: fallback,
      direccionesEnvio: [{ id: 'principal', etiqueta: 'Principal', ...fallback }],
    };
  }
}

export { MAX_DIRECCIONES };
