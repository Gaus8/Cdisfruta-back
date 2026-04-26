import { validateLoginUser, validateRegisterUser } from '../../schemaValidations/validateString.js';
import { generarTokenVerificacion, enviarCorreoVerificacion } from '../../middleware/validarEmail.js';
import bcrypt from 'bcrypt';
import User from '../../schema/userSchema.js';
import jwt from 'jsonwebtoken';

export const registrarUsuario = async (req, res) => {
  const validar = validateRegisterUser(req.body);

  if (validar.error) {
    return res.status(400).json({
      status: 'error',
      error: JSON.parse(validar.error.message)
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(validar.data.password, 10);
    const token = generarTokenVerificacion();

    const newUser = {
      nombre: validar.data.name,
      correo: validar.data.email,
      password: hashedPassword,
      verificado: false,
      codigo_verificacion: token
    };

    const createdUser = await createUser(newUser);

    try {
      // Enviar correo después de crear usuario
      await enviarCorreoVerificacion(newUser, token);
    } catch (emailError) {
      // Si falla el correo, eliminar usuario creado
      await User.deleteOne({ email: newUser.email });
      throw new Error('Error enviando correo de verificación');
    }

    res.status(201).json({
      status: 'success',
      message: createdUser,
      name: newUser.name
    });

  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

const createUser = async (user) => {
  const findUser = await User.findOne({ email: user.email });
  if (findUser) {
    throw new Error('ERROR: CORREO YA REGISTRADO!');
  }
  const create = await User.create(user);
  if (create) {
    return 'USUARIO REGISTRADO EXITOSAMENTE';
  }
};
