import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import User from '../backend/schema/userSchema.js'

dotenv.config();

const seedDB = async () => {
  // Guardafuegos de seguridad
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Operación cancelada: No se puede ejecutar el seed en PRODUCCIÓN.');
    process.exit(1);
  }

  try {
    // 1. Conexión a MongoDB usando la variable de desarrollo
    await mongoose.connect(process.env.DB_CONNECTION_STRING);
    console.log( 'Conectado a MongoDB local/dev...');

    // 2. Limpieza de colección
    await User.deleteMany({});
    console.log( 'Colección de usuarios limpiada.');

    // 3. Encriptación de contraseña común para usuarios de prueba
    const passwordHash = await bcrypt.hash('Hola123*', 10);

    // 4. Datos de prueba estructurados según tu esquema
    const dummyUsers = [
      {
        nombre: 'Administrador Pruebas',
        email: 'admin@dev.com',
        password: passwordHash,
        rol: 'admin',
        telefono: '3001234567',
        verificado: true,
        terminosAceptados: true
      },
      {
        nombre: 'Usuario Pruebas',
        email: 'user@dev.com',
        password: passwordHash,
        rol: 'user',
        telefono: '3109876543',
        verificado: true,
        terminosAceptados: true
      }
    ];

    // 5. Inserción de usuarios
    await User.insertMany(dummyUsers);
    console.log('✅ Usuarios de prueba insertados exitosamente.');

    // 6. Cierre de conexión
    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error al poblar la base de datos:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedDB();