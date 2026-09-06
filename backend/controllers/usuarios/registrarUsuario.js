import { validateRegisterUser } from '../../schemaValidations/validateString.js';
import { enviarCorreoVerificacion } from '../../middleware/validarEmail.js';
import bcrypt from 'bcrypt';
import User from '../../schema/userSchema.js';

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