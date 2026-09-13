import { validateLoginUser } from '../../schemaValidations/validateString.js';
import { enviarCorreoRecuperacion } from '../../middleware/enviarEmail.js';
import bcrypt from 'bcrypt';
import User from '../../schema/userSchema.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';

// 1. LOGIN Y VERIFICACIÓN EXISTENTES

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Todos los campos deben ser llenados'
    });
  }

  // Agregamos await para esperar la ejecución completa
  return await validateLogin(req, res);
};

const validateLogin = async (req, res) => {
  const validate = validateLoginUser(req.body);
  if (validate.error) {
    return res.status(400).json({
      status: 'error',
      message: 'Usuario o Contraseña Incorrecta'
    });
  }
  const { email, password } = validate.data;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'EMAIL NO REGISTRADO'
    });
  }

  if (!user.verificado) {
    return res.status(403).json({
      status: 'error',
      message: 'Debes verificar tu cuenta antes de iniciar sesión.'
    });
  }

  const checkPassword = await bcrypt.compare(password, user.password);
  if (!checkPassword) {
    return res.status(400).json({ // Cambiado de 404 a 400 (Bad Request)
      status: 'error',
      message: 'Contraseña incorrecta'
    });
  }

const FIVE_MINUTES_MS = 5 * 60 * 1000;

  const token = jwt.sign(
    {
      id: user._id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol
    },
    process.env.JWT_TOKEN,
    { expiresIn: '5m' } // 5m = 5 minutos en jsonwebtoken
  );

  return res.cookie('access_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: FIVE_MINUTES_MS // Sincronizado a 300,000 ms
  })
  .status(200).json({
    status: 'success',
    message: 'Ingreso Exitoso',
    user: {
      nombre: user.nombre,
      email: user.email,
      rol: user.rol
    }
  });
};

export const verificarCuenta = async (req, res) => {
  const { email, codigo } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        mensaje: 'Usuario no encontrado.'
      });
    }

    if (user.verificado) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'Esta cuenta ya ha sido verificada anteriormente.'
      });
    }

    if (codigo !== user.codigo_verificacion) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'El código de verificación es incorrecto.'
      });
    }

    user.verificado = true;
    user.codigo_verificacion = null;
    await user.save();

    return res.status(200).json({
      status: 'success',
      mensaje: '¡Cuenta verificada correctamente! Ya puedes iniciar sesión.'
    });

  } catch (err) {
    console.error('Error en verificación:', err);
    return res.status(500).json({
      status: 'error',
      mensaje: 'Hubo un problema en el servidor al verificar la cuenta.'
    });
  }
};


// 2. ACTUALIZACIÓN DE PERFIL Y AVATAR

export const actualizarPerfil = async (req, res) => {
  try {
    const userId = req.user.id;
    const { nombre, telefono } = req.body;

    const usuarioActualizado = await User.findByIdAndUpdate(
      userId,
      { nombre, telefono },
      { new: true }
    );

    if (!usuarioActualizado) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Perfil actualizado correctamente',
      usuario: {
        nombre: usuarioActualizado.nombre,
        email: usuarioActualizado.email,
        telefono: usuarioActualizado.telefono,
        avatar: usuarioActualizado.avatar
      }
    });
  } catch (err) {
    console.error('Error al actualizar perfil:', err);
    res.status(500).json({ status: 'error', message: 'Error en el servidor al actualizar perfil' });
  }
};

export const actualizarAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No se ha subido ninguna imagen' });
    }

    const avatarUrl = req.file.path || req.file.secure_url;

    const usuario = await User.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Avatar actualizado con éxito',
      avatarUrl: usuario.avatar
    });
  } catch (err) {
    console.error('Error al subir avatar:', err);
    res.status(500).json({ status: 'error', message: 'Error al procesar la imagen' });
  }
};


// 3. RECUPERACIÓN DE CONTRASEÑA

export const solicitarRestablecerPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'El correo electrónico es obligatorio.' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'No existe una cuenta con este correo.' });
    }

    // Generar token seguro
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Guardar token y expiración (15 minutos)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Pasamos tanto el objeto usuario como el correo directo por compatibilidad
    await enviarCorreoRecuperacion(user, resetUrl);

    return res.status(200).json({ message: 'Se ha enviado un enlace de recuperación a tu correo.' });
  } catch (error) {
    console.error('Error detallado en solicitarRestablecerPassword:', error);
    return res.status(500).json({ 
      message: 'Error al procesar el envío del correo.',
      error: error.message 
    });
  }
};

export const restablecerPasswordConToken = async (req, res) => {
  try {
    const { token, nuevaPassword } = req.body;

    if (!token || !nuevaPassword) {
      return res.status(400).json({ message: 'El token y la nueva contraseña son obligatorios.' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'El enlace es inválido o ha expirado.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(nuevaPassword, salt);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('Error en restablecerPasswordConToken:', error);
    return res.status(500).json({ message: 'Error en el servidor al restablecer la contraseña.' });
  }
};

export const cambiarPasswordSeguro = async (req, res) => {
  try {
    const userId = req.user.id;
    const { passwordActual, nuevaPassword, codigoCorreo } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    }

    const checkPassword = await bcrypt.compare(passwordActual, user.password);
    if (!checkPassword) {
      return res.status(400).json({ status: 'error', message: 'La contraseña actual es incorrecta' });
    }

    if (!user.resetPasswordToken || user.resetPasswordToken !== codigoCorreo) {
      return res.status(400).json({ status: 'error', message: 'El código de verificación es inválido' });
    }

    if (user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ status: 'error', message: 'El código de verificación ha expirado' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(nuevaPassword, salt);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (err) {
    console.error('Error al cambiar contraseña:', err);
    res.status(500).json({ status: 'error', message: 'Error en el servidor al cambiar la contraseña' });
  }
};