import { afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

vi.mock('../backend/services/emailService.js', () => ({
  enviarCorreoVerificacion: vi.fn(async () => ({ mocked: true })),
  enviarCorreoRecuperacion: vi.fn(async () => ({ mocked: true })),
}));

process.env.VERCEL = '1';
process.env.NODE_ENV = 'test';
process.env.JWT_TOKEN = 'secreto-de-prueba-cdisfruta';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.EMAIL_USER = '';
process.env.EMAIL_PASSWORD = '';
process.env.WOMPI_PUBLIC_KEY = '';
process.env.WOMPI_PRIVATE_KEY = '';
process.env.WOMPI_INTEGRITY_SECRET = '';
process.env.WOMPI_EVENTS_SECRET = '';

const mongo = await MongoMemoryServer.create();
process.env.DB_CONNECTION_STRING = mongo.getUri();
await mongoose.connect(process.env.DB_CONNECTION_STRING);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
