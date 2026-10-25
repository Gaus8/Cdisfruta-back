import { beforeEach, describe, expect, it } from 'vitest';
import User from '../backend/models/userSchema.js';
import { crearCuenta, entrar, http, limpiarDb } from './helpers.js';

const casa = {
  etiqueta: 'Casa',
  nombres: 'Ana',
  apellidos: 'Perez',
  whatsapp: '3001234567',
  departamento: 'Cundinamarca',
  municipio: 'Ubaté',
  direccion: 'Calle 10 #5-20',
  barrio: 'Centro',
};

describe('direcciones de envío del cliente', () => {
  beforeEach(async () => {
    await limpiarDb();
  });

  it('permite registrar una dirección y listarla para elegirla luego', async () => {
    await crearCuenta({ email: 'ana@example.com' });
    const ana = await entrar('ana@example.com');

    const creada = await http.post('/api/auth/direcciones-envio').set('Cookie', ana.cookie).send(casa);
    expect(creada.status).toBe(201);
    expect(creada.body.direccionesEnvio).toHaveLength(1);
    expect(creada.body.direccion.municipio).toBe('Ubaté');

    const lista = await http.get('/api/auth/direcciones-envio').set('Cookie', ana.cookie);
    expect(lista.status).toBe(200);
    expect(lista.body.direccionesEnvio[0].direccion).toBe('Calle 10 #5-20');

    const sesion = await http.get('/api/auth/verificar-token').set('Cookie', ana.cookie);
    expect(sesion.body.user.direccionesEnvio).toHaveLength(1);
    expect(sesion.body.user.direccionEnvio.barrio).toBe('Centro');

    const id = lista.body.direccionesEnvio[0].id;
    const borrada = await http.delete(`/api/auth/direcciones-envio/${id}`).set('Cookie', ana.cookie);
    expect(borrada.status).toBe(200);
    expect(borrada.body.direccionesEnvio).toHaveLength(0);

    const user = await User.findOne({ email: 'ana@example.com' });
    expect(user.direccionesEnvio).toHaveLength(0);
  });
});
