import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import User from '../backend/models/userSchema.js';
import Producto from '../backend/models/productsSchema.js';

export const CLAVE = 'Prueba.1a';
export const http = request(app);

export const cookieDe = (res) => {
  const raw = res.headers['set-cookie'] || [];
  const lista = Array.isArray(raw) ? raw : [raw];
  const linea = lista.find((item) => String(item).startsWith('access_token='));
  return linea ? String(linea).split(';')[0] : '';
};

export async function crearCuenta({
  nombre = 'Camila Rojas',
  email,
  password = CLAVE,
  rol = 'user',
  permisos = [],
  verificado = true,
} = {}) {
  return User.create({
    nombre,
    email,
    password: await bcrypt.hash(password, 10),
    rol,
    permisos,
    verificado,
    terminosAceptados: true,
    codigo_verificacion: verificado ? null : '123456',
  });
}

export async function entrar(email, password = CLAVE) {
  const res = await http.post('/api/auth/login').send({ email, password });
  return { res, cookie: cookieDe(res) };
}

export const envio = (correo) => ({
  nombres: 'Ana',
  apellidos: 'Perez',
  whatsapp: '3001234567',
  departamento: 'Cundinamarca',
  municipio: 'Ubate',
  direccion: 'Calle 10',
  barrio: 'Centro',
  correo,
});

export async function crearProducto(datos = {}) {
  return Producto.create({
    nombre: 'Mango deshidratado',
    descripcion: 'Snack de mango',
    precio: 12000,
    categoria: 'Snack',
    stock: 5,
    imagen: '/img/mango.webp',
    activo: true,
    publicarEnTienda: true,
    enCatalogo: true,
    ...datos,
  });
}

export async function limpiarDb() {
  const colecciones = Object.values(mongoose.connection.collections);
  await Promise.all(colecciones.map((coleccion) => coleccion.deleteMany({})));
}
