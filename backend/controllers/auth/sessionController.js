import User from '../../models/userSchema.js'
import Pedido from '../../models/pedidoSchema.js'
import { asegurarDireccionEnvio } from '../../utils/direccionEnvio.js'

export const verificarTokenController = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-password -codigo_verificacion -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({ valid: false, message: 'Usuario no encontrado' });
    }

    const { direccionEnvio, direccionesEnvio } = await asegurarDireccionEnvio(User, Pedido, user);

    return res.status(200).json({
      valid: true,
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
    return res.status(500).json({ valid: false, message: 'Error al verificar token' });
  }
};
