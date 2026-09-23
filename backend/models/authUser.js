import User from '../schema/userSchema.js'

export const verificarTokenController = async (req, res) => {
  try {
    // req.user.id viene gracias a que tu middleware verifyToken lo decodificó
    const userId = req.user.id; 

    // Consultamos la base de datos para obtener el avatar y teléfono más recientes
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ valid: false, message: 'Usuario no encontrado' });
    }

    return res.status(200).json({
      valid: true,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        telefono: user.telefono,
        avatar: user.avatar // 👈 Datos frescos directo de MongoDB
      }
    });
  } catch (error) {
    return res.status(500).json({ valid: false, message: 'Error al verificar token' });
  }
};