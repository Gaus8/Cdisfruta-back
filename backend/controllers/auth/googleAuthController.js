import User from '../../schema/userSchema.js';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcrypt';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage' // Necesario para el flujo auth-code con React
);

export const googleLogin = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      status: 'error',
      message: 'No se recibió el código de autorización'
    });
  }

  try {
    // 1. Canjear el código por los tokens
    const { tokens } = await client.getToken({
      code,
      redirect_uri: 'postmessage'
    });

    // 2. Validar el id_token devuelto por Google
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name || payload.given_name || "Usuario Google";

    // 3. Lógica de MONGODB
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
    }

    // 4. Generar tu JWT propio
    const token = jwt.sign(
      {
        id: user._id || user.id,
        nombre: user.nombre || user.name,
        email: user.email,
        rol: user.rol
      },
      process.env.JWT_TOKEN,
      { expiresIn: '1h' }
    );

    // 5. Responder con Cookie + JSON
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000
    })
    .status(200)
    .json({
      status: 'success',
      message: 'Ingreso Exitoso',
      rol: user.rol,
      token
    });

  } catch (error) {
    console.error('Error Google Login Detallado:', error?.response?.data || error);
    res.status(400).json({
      status: 'error',
      message: 'Error de autenticación con Google'
    });
  }
};