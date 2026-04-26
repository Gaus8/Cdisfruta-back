import { validateLoginUser, validateRegisterUser } from '../schemaValidations/validateString.js';
import { generarTokenVerificacion, enviarCorreoVerificacion } from '../middleware/validarEmail.js';
import bcrypt from 'bcrypt';
import User from '../schema/userSchema.js';
import jwt from 'jsonwebtoken';


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
  if (!user.verified) {
    return res.status(403).json({
      status: 'error',
      message: 'Debes verificar tu cuenta por correo antes de iniciar sesión.'
    });
  }
  const checkPassword = await bcrypt.compare(password, user.password);

  if (!checkPassword) {
    return res.status(404).json({
      status: 'error',
      message: 'Contraseña incorrecta'
    });
  }
  // Token y validacion con cookies
  const token = jwt.sign({
    id: user.id,
    name: user.name,
    email: user.email,
    rol: user.rol
  }, process.env.JWT_TOKEN,
    {
      expiresIn: '1h'
    });

  res.cookie('access_token', token, {
    httpOnly: true,
    secure: true,      // false en desarrollo
    sameSite: 'none',    // 'lax' o none en desarrollo
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  })
    .status(200).json({
      status: 'success',
      message: 'Ingreso Exitoso',
      rol: user.rol
    });
};

export const verificarCuenta = async (req, res) => {
  const { token } = req.params;
  try {
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ mensaje: 'Token de verificación inválido o expirado.' });
    }

    user.verified = true;
    user.verificationToken = undefined;
    await user.save();

    // Responder con mensaje JSON, el frontend se encarga de la redirección
    res.status(200).json({ mensaje: 'Cuenta verificada correctamente.' });
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al verificar la cuenta.' });
  }
};
