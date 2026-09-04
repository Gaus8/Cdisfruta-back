import { validateRegisterUser } from '../../schemaValidations/validateString.js';
import { enviarCorreoVerificacion } from '../../middleware/validarEmail.js';
import bcrypt from 'bcrypt';
import User from '../../schema/userSchema.js';
// jsonwebtoken no se está usando en este fragmento, puedes mantenerlo si lo usas en otro lado

const generarTokenVerificacion = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const registrarUsuario = async (req, res) => {
  // Validación estricta para los términos
  if (req.body.terminosAceptados !== true) {
    return res.status(400).json({
      status: 'error',
      message: 'Debes aceptar los términos y condiciones para registrarte.'
    });
  }

  const validar = validateRegisterUser(req.body);

  if (validar.error) {
    return res.status(400).json({
      status: 'error',
      error: JSON.parse(validar.error.message)
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(validar.data.password, 10);
    const codigoSeisDigitos = generarTokenVerificacion();

    const newUser = {
      nombre: validar.data.name,
      email: validar.data.email,
      password: hashedPassword,
      verificado: false,
      codigo_verificacion: codigoSeisDigitos,
      terminosAceptados: true // Lo fijamos en true porque ya pasó la validación superior
    };

    const statusMessage = await createUser(newUser);

    try {
      await enviarCorreoVerificacion(newUser, codigoSeisDigitos);
    } catch (emailError) {
      await User.deleteOne({ email: newUser.email });
      throw new Error('Error enviando correo de verificación. Inténtalo de nuevo.');
    }

    res.status(201).json({
      status: 'success',
      message: statusMessage,
      user: { name: newUser.nombre, email: newUser.email }
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