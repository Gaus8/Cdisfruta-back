import User from '../../models/userSchema.js';
import Pedido from '../../models/pedidoSchema.js';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcrypt';
import { sessionCookieOptions } from '../../utils/sessionCookie.js';
import { asegurarDireccionEnvio } from '../../utils/direccionEnvio.js';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage' // Necesario para el flujo auth-code con React
);

const googleProfile = async ({ code, credential }) => {
  if (credential) {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
  }

  const { tokens } = await client.getToken({
    code,
    redirect_uri: 'postmessage'
  });
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
};

export const googleLogin = async (req, res) => {
  const { code, credential } = req.body;

  if (!code && !credential) {
    return res.status(400).json({
      status: 'error',
      message: 'No se recibió la sesión de Google'
    });
  }

  try {
    const payload = await googleProfile({ code, credential });
    const email = payload?.email;
    const name = payload?.name || payload?.given_name || "Usuario Google";

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Google no compartió el correo de la cuenta.'
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      // Revisa si en tu Schema el campo es 'name' o 'nombre' (aquí asignamos ambos por compatibilidad)
      user = new User({
        name: name,
        nombre: name,
        email: email,
        password: await bcrypt.hash(Math.random().toString(36).slice(-10), 10),
        verificado: true,
        terminosAceptados: true,
        rol: 'user'
      });
      await user.save();
    } else if (!user.verificado) {
      user.verificado = true;
      await user.save();
    }

    // 4. Generar tu JWT propio
    const SESSION_MS = 60 * 60 * 1000;
    const token = jwt.sign(
      {
        id: user._id || user.id,
        nombre: user.nombre || user.name,
        email: user.email,
        rol: user.rol,
        permisos: user.permisos || []
      },
      process.env.JWT_TOKEN,
      { expiresIn: '1h' }
    );

    const { direccionEnvio, direccionesEnvio } = await asegurarDireccionEnvio(User, Pedido, user);

    res.cookie('access_token', token, sessionCookieOptions(SESSION_MS))
    .status(200)
    .json({
      status: 'success',
      message: 'Ingreso Exitoso',
      rol: user.rol,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        permisos: user.permisos || [],
        telefono: user.telefono,
        avatar: user.avatar,
        direccionEnvio,
        direccionesEnvio,
      }
    });

  } catch (error) {
    console.error('Error Google Login Detallado:', error?.response?.data || error);
    res.status(400).json({
      status: 'error',
      message: 'Error de autenticación con Google'
    });
  }
};