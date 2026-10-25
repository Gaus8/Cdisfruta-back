import { beforeEach, describe, expect, it } from 'vitest';
import { CLAVE, crearCuenta, crearProducto, entrar, http, limpiarDb } from './helpers.js';

describe('Roles y permisos', () => {
  beforeEach(limpiarDb);

  it('reserva el listado de usuarios para administración', async () => {
    await crearCuenta({ email: 'admin@example.com', rol: 'admin', permisos: ['*'] });
    await crearCuenta({ email: 'cliente@example.com', nombre: 'Laura Gomez' });
    const admin = await entrar('admin@example.com');
    const cliente = await entrar('cliente@example.com');

    const sinSesion = await http.get('/api/auth/admin/usuarios');
    expect(sinSesion.status).toBe(403);

    const comoCliente = await http.get('/api/auth/admin/usuarios').set('Cookie', cliente.cookie);
    expect(comoCliente.status).toBe(403);

    const comoAdmin = await http.get('/api/auth/admin/usuarios').set('Cookie', admin.cookie);
    expect(comoAdmin.status).toBe(200);
    expect(comoAdmin.body.usuarios).toEqual([
      expect.objectContaining({ correo: 'cliente@example.com', estado: 'active' }),
    ]);
  });

  it('impide que un administrador se quite el rol y asigna permisos del rol elegido', async () => {
    const admin = await crearCuenta({ email: 'admin@example.com', rol: 'admin', permisos: ['*'] });
    const cliente = await crearCuenta({ email: 'cliente@example.com' });
    const { cookie } = await entrar('admin@example.com');

    const propio = await http.patch(`/api/auth/admin/roles/${admin._id}`).set('Cookie', cookie).send({
      rol: 'user',
      permisos: [],
    });
    expect(propio.status).toBe(403);

    const invalido = await http.patch(`/api/auth/admin/roles/${cliente._id}`).set('Cookie', cookie).send({
      rol: 'logistica',
      permisos: ['catalog:write'],
    });
    expect(invalido.status).toBe(400);

    await crearCuenta({ email: 'admin2@example.com', rol: 'admin', permisos: ['*'] });
    const sesionNueva = await entrar('admin2@example.com');
    const degradar = await http.patch(`/api/auth/admin/roles/${admin._id}`).set('Cookie', sesionNueva.cookie).send({
      rol: 'user',
      permisos: [],
    });
    expect(degradar.status).toBe(200);
    expect(degradar.body.usuario.rol).toBe('user');
  });

  it('entrega inventario a logística y catálogo a quien tiene ese permiso, sin cruzarlos', async () => {
    await crearProducto({ precio: 15000, codigoBarras: '7701234567890' });
    await crearCuenta({
      email: 'logistica@example.com',
      rol: 'logistica',
      permisos: ['inventory:read', 'inventory:write'],
    });
    await crearCuenta({
      email: 'catalogo@example.com',
      rol: 'catalogo',
      permisos: ['catalog:read', 'catalog:write'],
    });
    await crearCuenta({ email: 'admin@example.com', rol: 'admin', permisos: ['*'] });

    const logistica = await entrar('logistica@example.com');
    const catalogo = await entrar('catalogo@example.com');
    const admin = await entrar('admin@example.com');

    const inventarioLogistica = await http.get('/api/admin/inventario').set('Cookie', logistica.cookie);
    expect(inventarioLogistica.status).toBe(200);
    expect(inventarioLogistica.body).toHaveLength(1);
    expect(inventarioLogistica.body[0].precio).toBeUndefined();
    expect(inventarioLogistica.body[0].stock).toBe(5);

    // El rol catalogo incluye inventory:read (puede consultar stock al publicar).
    const inventarioCatalogo = await http.get('/api/admin/inventario').set('Cookie', catalogo.cookie);
    expect(inventarioCatalogo.status).toBe(200);

    const catalogoLogistica = await http.get('/api/admin/catalogo').set('Cookie', logistica.cookie);
    expect(catalogoLogistica.status).toBe(403);

    const catalogoOk = await http.get('/api/admin/catalogo').set('Cookie', catalogo.cookie);
    expect(catalogoOk.status).toBe(200);
    expect(catalogoOk.body[0].precio).toBe(15000);

    const inventarioAdmin = await http.get('/api/admin/inventario').set('Cookie', admin.cookie);
    expect(inventarioAdmin.body[0].precio).toBe(15000);

    // Rol user + solo inventory:read (el rol logistica ya trae inventory:write por defecto).
    const lecturaSola = await crearCuenta({
      email: 'lectura@example.com',
      rol: 'user',
      permisos: ['inventory:read'],
    });
    const lectura = await entrar(lecturaSola.email);
    const ajusteProhibido = await http.patch(`/api/admin/inventario/${inventarioAdmin.body[0]._id}/stock`)
      .set('Cookie', lectura.cookie)
      .send({ delta: 1 });
    expect(ajusteProhibido.status).toBe(403);
  });

  it('ajusta stock por código, retira el artículo y no permite crear uno sin foto', async () => {
    const producto = await crearProducto({ codigoBarras: '7701234567890', publicarEnTienda: false, enCatalogo: false });
    await crearCuenta({
      email: 'logistica@example.com',
      rol: 'logistica',
      permisos: ['inventory:read', 'inventory:write'],
    });
    const { cookie } = await entrar('logistica@example.com');

    const sinFoto = await http.post('/api/admin/inventario').set('Cookie', cookie)
      .field('nombre', 'Pitaya')
      .field('categoria', 'Snack')
      .field('stock', '3');
    expect(sinFoto.status).toBe(400);

    const porCodigo = await http.patch('/api/admin/inventario/codigo/7701234567890').set('Cookie', cookie).send({ delta: -2 });
    expect(porCodigo.status).toBe(200);
    expect(porCodigo.body.product.stock).toBe(3);

    const negativo = await http.patch('/api/admin/inventario/codigo/7701234567890').set('Cookie', cookie).send({ delta: -10 });
    expect(negativo.status).toBe(409);

    const retiro = await http.delete(`/api/admin/inventario/${producto._id}`).set('Cookie', cookie);
    expect(retiro.status).toBe(200);

    const lista = await http.get('/api/admin/inventario').set('Cookie', cookie);
    expect(lista.body).toHaveLength(0);
  });

  it('solo un administrador exporta inventario al catálogo, y el borrador sigue fuera de la tienda', async () => {
    const producto = await crearProducto({
      nombre: 'Pitaya',
      publicarEnTienda: false,
      enCatalogo: false,
      precio: 0,
    });
    await crearCuenta({
      email: 'logistica@example.com',
      rol: 'logistica',
      permisos: ['inventory:read', 'inventory:write'],
    });
    await crearCuenta({ email: 'admin@example.com', rol: 'admin', permisos: ['*'] });
    const logistica = await entrar('logistica@example.com');
    const admin = await entrar('admin@example.com');

    const prohibida = await http.patch('/api/admin/inventario/exportar-catalogo').set('Cookie', logistica.cookie).send({
      ids: [String(producto._id)],
    });
    expect(prohibida.status).toBe(403);

    const exportado = await http.patch('/api/admin/inventario/exportar-catalogo').set('Cookie', admin.cookie).send({
      ids: [String(producto._id)],
    });
    expect(exportado.status).toBe(200);

    const tienda = await http.get('/api/get-productos');
    expect(tienda.body.find((item) => item.nombre === 'Pitaya')).toBeUndefined();

    const catalogo = await http.get('/api/admin/catalogo').set('Cookie', admin.cookie);
    expect(catalogo.body.map((item) => item.nombre)).toContain('Pitaya');
  });
});
