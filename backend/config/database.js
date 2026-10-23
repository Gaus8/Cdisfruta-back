import mongoose from 'mongoose';

let pendingConnection;

export const connectionDb = async () => {
  try {
    const connectDb = await mongoose.connect(process.env.DB_CONNECTION_STRING);
    console.log(
      'Connection established',
      '\nnombre DB:',connectDb.connection.name,
    )

  } catch (err) {
    console.error('Fallo en la conexión con MongoDB:', err.message);
    throw err;
  };
};

export const ensureDb = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!pendingConnection) {
    pendingConnection = connectionDb().catch((error) => {
      pendingConnection = null;
      throw error;
    });
  }
  return pendingConnection;
};

