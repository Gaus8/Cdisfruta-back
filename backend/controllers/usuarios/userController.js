import { validateLoginUser } from '../../schemaValidations/validateString.js';
import { enviarCorreoVerificacion } from '../../middleware/validarEmail.js';
import bcrypt from 'bcrypt';
import User from '../../schema/userSchema.js';
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
  validateLogin(req, res);
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
    return res.status(404).json({
      status: 'error',
      message: 'Contraseña incorrecta'
    });
  }

  const token = jwt.sign({
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol
  }, process.env.JWT_TOKEN, {
    expiresIn: '1h'
  });

  res.cookie('access_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  })
    .status(200).json({
      status: 'success',
      message: 'Ingreso Exitoso',
      rol: user.rol,
      token
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


// 3. SEGURIDAD Y CAMBIO SEGURO DE CONTRASEÑA

export const solicitarCodigoPass = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    }

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    
    user.resetPasswordToken = codigo;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // Expira en 15 minutos
    await user.save();

    await enviarCorreoVerificacion(user.email, codigo);

    res.status(200).json({
      status: 'success',
      message: 'Código de verificación enviado al correo electrónico'
    });
  } catch (err) {
    console.error('Error al solicitar código:', err);
    res.status(500).json({ status: 'error', message: 'Error al enviar el correo de verificación' });
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
    
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
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