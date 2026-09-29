import { validateRegisterUser } from '../../schemaValidations/validateString.js';
import { enviarCorreoVerificacion } from '../../middleware/enviarEmail.js';
import bcrypt from 'bcrypt';
import User from '../../schema/userSchema.js';
import Pedido from '../../schema/pedidoSchema.js';
import crypto from 'crypto';

const generarTokenVerificacion = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const registrarUsuario = async (req, res) => {
  // 1. Validar aceptación explícita de términos
  if (req.body.terminosAceptados !== true) {
    return res.status(400).json({
      status: 'error',
      message: 'Debes aceptar los términos y condiciones para registrarte.'
    });
  }

  // 2. Validar campos con Zod/Joi
  const validar = validateRegisterUser(req.body);

  if (validar.error) {
    return res.status(400).json({
      status: 'error',
      error: JSON.parse(validar.error.message)
    });
  }

  const { name, email, password } = validar.data;

  try {
    // 3. Verificar en la base de datos dentro del try principal
    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.status(400).json({
        status: 'error',
        message: 'ERROR: CORREO YA REGISTRADO!'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const codigoSeisDigitos = generarTokenVerificacion();

    // 4. Crear el usuario en MongoDB
    const newUser = await User.create({
      nombre: name,
      email: email,
      password: hashedPassword,
      verificado: false,
      codigo_verificacion: codigoSeisDigitos,
      terminosAceptados: true,
      fechaAceptacionTerminos: new Date() // Sello de tiempo legal
    });

    // 5. Envío de correo con rollback en caso de fallo
    try {
      await enviarCorreoVerificacion(newUser, codigoSeisDigitos);
    } catch (emailError) {
      await User.deleteOne({ email: newUser.email });
      return res.status(500).json({
        status: 'error',
        message: 'Error enviando el correo de verificación. Inténtalo de nuevo.'
      });
    }

    return res.status(201).json({
      status: 'success',
      message: 'USUARIO REGISTRADO EXITOSAMENTE',
      user: { name: newUser.nombre, email: newUser.email }
    });

  } catch (error) {
    console.error('Error en el registro:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor'
    });
  }
};

/** Creates the account requested after guest checkout and atomically claims that order. */
export const registrarUsuarioPostCompra = async (req, res) => {
  if (req.body.terminosAceptados !== true) {
    return res.status(400).json({ status: 'error', message: 'Debes aceptar los términos y condiciones para registrarte.' });
  }

  const email = String(req.body.email || '').trim().toLowerCase();
  const emailConfirmacion = String(req.body.emailConfirmacion || '').trim().toLowerCase();
  const claimToken = String(req.body.claimToken || '');
  if (!email || email !== emailConfirmacion) {
    return res.status(400).json({ status: 'error', message: 'Los correos electrónicos no coinciden.' });
  }
  if (claimToken.length < 40 || claimToken.length > 100) {
    return res.status(400).json({ status: 'error', message: 'No se encontró una referencia válida del pedido para asociar.' });
  }

  const validar = validateRegisterUser({ ...req.body, email, terminosAceptados: true });
  if (validar.error) return res.status(400).json({ status: 'error', error: JSON.parse(validar.error.message) });

  const claimHash = crypto.createHash('sha256').update(claimToken).digest('hex');
  let newUser;
  try {
    const pedido = await Pedido.findOne({
      guestClaimTokenHash: claimHash,
      guestClaimExpiresAt: { $gt: new Date() },
      usuario: null,
      'datosEnvio.correo': email
    }).select('_id guestClaimExpiresAt').lean();
    if (!pedido) return res.status(400).json({ status: 'error', message: 'El enlace del pedido venció o el correo no coincide con la compra.' });

    if (await User.exists({ email })) {
      return res.status(409).json({ status: 'error', message: 'Este correo ya tiene una cuenta. Inicia sesión para consultar tus pedidos.' });
    }

    const hashedPassword = await bcrypt.hash(validar.data.password, 10);
    const codigoSeisDigitos = generarTokenVerificacion();
    newUser = await User.create({
      nombre: validar.data.name,
      email,
      password: hashedPassword,
      verificado: false,
      codigo_verificacion: codigoSeisDigitos,
      verificationEmailLastSentAt: new Date(),
      terminosAceptados: true,
      fechaAceptacionTerminos: new Date()
    });

    const linkedOrder = await Pedido.findOneAndUpdate({
      _id: pedido._id,
      guestClaimTokenHash: claimHash,
      guestClaimExpiresAt: { $gt: new Date() },
      usuario: null,
      'datosEnvio.correo': email
    }, { $set: { usuario: newUser._id }, $unset: { guestClaimTokenHash: 1, guestClaimExpiresAt: 1 } }, { returnDocument: 'after' }).select('_id');

    if (!linkedOrder) {
      await User.deleteOne({ _id: newUser._id });
      return res.status(409).json({ status: 'error', message: 'No se pudo vincular el pedido. Inicia sesión o comunícate con soporte.' });
    }

    try {
      await enviarCorreoVerificacion(newUser, codigoSeisDigitos);
    } catch (emailError) {
      console.error('No se pudo enviar el correo de verificación post-compra:', {
        code: emailError.code,
        responseCode: emailError.responseCode,
        message: emailError.message
      });
      return res.status(201).json({
        status: 'success',
        message: 'La cuenta y el pedido quedaron vinculados. El correo de verificación no se pudo enviar ahora; podrás solicitarlo de nuevo más tarde.',
        user: { name: newUser.nombre, email: newUser.email },
        pedidoVinculado: String(linkedOrder._id),
        requiereVerificacion: true,
        correoEnviado: false
      });
    }

    return res.status(201).json({
      status: 'success',
      message: 'Cuenta creada y pedido asociado. Verifica el correo para activar tu acceso.',
      user: { name: newUser.nombre, email: newUser.email },
      pedidoVinculado: String(linkedOrder._id),
      requiereVerificacion: true,
      correoEnviado: true
    });
  } catch (error) {
    if (newUser?._id) await User.deleteOne({ _id: newUser._id }).catch(() => {});
    if (error.code === 11000) return res.status(409).json({ status: 'error', message: 'Este correo ya tiene una cuenta. Inicia sesión para consultar tus pedidos.' });
    console.error('Error al crear cuenta posterior a la compra:', error);
    return res.status(500).json({ status: 'error', message: 'No se pudo completar el registro posterior a la compra.' });
  }
};

export const reenviarVerificacionPostCompra = async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ status: 'error', message: 'Ingresa un correo válido.' });
  }

  try {
    const user = await User.findOne({ email, verificado: false });
    if (!user) {
      return res.status(200).json({ status: 'success', message: 'Si existe una cuenta pendiente de verificación, enviaremos un código.' });
    }

    const cooldownMs = 60 * 1000;
    const lastSentAt = user.verificationEmailLastSentAt?.getTime?.() || 0;
    const remainingSeconds = Math.ceil((lastSentAt + cooldownMs - Date.now()) / 1000);
    if (remainingSeconds > 0) {
      return res.status(429).json({ status: 'error', message: `Espera ${remainingSeconds} segundos antes de volver a solicitar el código.` });
    }

    user.verificationEmailLastSentAt = new Date();
    await user.save();
    try {
      await enviarCorreoVerificacion(user, user.codigo_verificacion);
    } catch (emailError) {
      console.error('No se pudo reenviar el correo de verificación post-compra:', {
        code: emailError.code,
        responseCode: emailError.responseCode,
        message: emailError.message
      });
      return res.status(503).json({ status: 'error', message: 'El servicio de correo no está disponible ahora. Inténtalo de nuevo más tarde.' });
    }

    return res.status(200).json({ status: 'success', message: 'Enviamos un nuevo correo con tu código de verificación.' });
  } catch (error) {
    console.error('Error al reenviar verificación post-compra:', error.message);
    return res.status(500).json({ status: 'error', message: 'No se pudo procesar la solicitud de verificación.' });
  }
};
