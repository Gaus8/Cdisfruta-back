import { beforeEach, describe, expect, it } from 'vitest';
import User from '../backend/models/userSchema.js';
import { CLAVE, cookieDe, crearCuenta, entrar, http, limpiarDb } from './helpers.js';

const registroValido = (email) => ({
  name: 'Camila Rojas',
  email,
  password: CLAVE,
  terminosAceptados: true,
});

describe('Cuentas y sesión', () => {
  beforeEach(limpiarDb);

  it('responde que el servidor está funcionando', async () => {
    const res = await http.get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('funcionando');
  });

  it('rechaza un registro sin términos, con datos inválidos o con un correo repetido', async () => {
    const sinTerminos = await http.post('/api/auth/registro').send({
      ...registroValido('ana@example.com'),
      terminosAceptados: false,
    });
    expect(sinTerminos.status).toBe(400);

    const claveDebil = await http.post('/api/auth/registro').send({
      ...registroValido('ana@example.com'),
      password: 'clave',
    });
    expect(claveDebil.status).toBe(400);

    const creado = await http.post('/api/auth/registro').send(registroValido('ana@example.com'));
    expect(creado.status).toBe(201);
    expect(creado.body.user).toMatchObject({ name: 'Camila Rojas', email: 'ana@example.com' });
    const pendiente = await User.findOne({ email: 'ana@example.com' });
    expect(pendiente.verificado).toBe(false);
    expect(pendiente.codigo_verificacion).toMatch(/^\d{6}$/);

    const repetido = await http.post('/api/auth/registro').send(registroValido('ana@example.com'));
    expect(repetido.status).toBe(400);
    expect(repetido.body.message).toContain('CORREO YA REGISTRADO');
  });

  it('no deja entrar hasta verificar el código y después abre la sesión', async () => {
    await http.post('/api/auth/registro').send(registroValido('ana@example.com'));
    const codigo = (await User.findOne({ email: 'ana@example.com' })).codigo_verificacion;

    const antes = await http.post('/api/auth/login').send({ email: 'ana@example.com', password: CLAVE });
    expect(antes.status).toBe(403);

    const codigoMal = await http.post('/api/auth/verificar-cuenta').send({ email: 'ana@example.com', codigo: '000000' });
    expect(codigoMal.status).toBe(400);

    const verificado = await http.post('/api/auth/verificar-cuenta').send({ email: 'ana@example.com', codigo });
    expect(verificado.status).toBe(200);

    const login = await entrar('ana@example.com');
    expect(login.res.status).toBe(200);
    expect(login.res.body.user).toMatchObject({ email: 'ana@example.com', rol: 'user' });
    expect(login.cookie).toMatch(/^access_token=/);

    const sesion = await http.get('/api/auth/verificar-token').set('Cookie', login.cookie);
    expect(sesion.status).toBe(200);
    expect(sesion.body.valid).toBe(true);

    const cierre = await http.post('/api/logout').set('Cookie', login.cookie);
    expect(cierre.status).toBe(200);
    expect(cookieDe(cierre)).toBe('access_token=');
    expect(String(cierre.headers['set-cookie'])).toContain('1970');

    const sinCookie = await http.get('/api/auth/verificar-token');
    expect(sinCookie.status).toBe(403);
  });

  it('rechaza correo desconocido y contraseña incorrecta', async () => {
    await crearCuenta({ email: 'ana@example.com' });

    const desconocido = await http.post('/api/auth/login').send({ email: 'nadie@example.com', password: CLAVE });
    expect(desconocido.status).toBe(404);

    const claveMal = await http.post('/api/auth/login').send({ email: 'ana@example.com', password: 'Otra.123' });
    expect(claveMal.status).toBe(400);
  });

  it('restablece la contraseña con el enlace enviado y permite entrar con la nueva', async () => {
    await crearCuenta({ email: 'ana@example.com' });

    const solicitud = await http.post('/api/auth/codigo-password').send({ email: 'ana@example.com' });
    expect(solicitud.status).toBe(200);
    const token = (await User.findOne({ email: 'ana@example.com' })).resetPasswordToken;
    expect(token).toEqual(expect.any(String));

    const cambio = await http.post('/api/auth/reset-password').send({ token, nuevaPassword: 'Nueva.2b' });
    expect(cambio.status).toBe(200);

    const vieja = await entrar('ana@example.com', CLAVE);
    expect(vieja.res.status).toBe(400);

    const nueva = await entrar('ana@example.com', 'Nueva.2b');
    expect(nueva.res.status).toBe(200);
  });

  it('cambia la contraseña desde la sesión solo si la actual coincide', async () => {
    await crearCuenta({ email: 'ana@example.com' });
    const { cookie } = await entrar('ana@example.com');

    const incorrecta = await http.patch('/api/auth/cambiar-password').set('Cookie', cookie).send({
      passActual: 'Otra.123',
      nuevaPassword: 'Nueva.2b',
    });
    expect(incorrecta.status).toBe(400);

    const cambiada = await http.patch('/api/auth/cambiar-password').set('Cookie', cookie).send({
      passActual: CLAVE,
      nuevaPassword: 'Nueva.2b',
    });
    expect(cambiada.status).toBe(200);

    const acceso = await entrar('ana@example.com', 'Nueva.2b');
    expect(acceso.res.status).toBe(200);
  });

  it('actualiza el nombre y el teléfono del perfil', async () => {
    await crearCuenta({ email: 'ana@example.com' });
    const { cookie } = await entrar('ana@example.com');

    const res = await http.patch('/api/auth/actualizar-perfil').set('Cookie', cookie).send({
      nombre: 'Ana Rojas',
      telefono: '3100001122',
    });
    expect(res.status).toBe(200);

    const guardado = await User.findOne({ email: 'ana@example.com' });
    expect(guardado.nombre).toBe('Ana Rojas');
    expect(guardado.telefono).toBe('3100001122');
  });
});
