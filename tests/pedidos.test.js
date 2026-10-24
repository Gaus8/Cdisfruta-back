import { beforeEach, describe, expect, it } from 'vitest';
import Producto from '../backend/models/productsSchema.js';
import { crearCuenta, crearProducto, entrar, envio, http, limpiarDb } from './helpers.js';

describe('Tienda, pedidos y portada', () => {
  beforeEach(limpiarDb);

  it('la tienda lista solo productos activos y publicados', async () => {
    await crearProducto({ nombre: 'Mango deshidratado' });
    await crearProducto({ nombre: 'Oculto', publicarEnTienda: false });
    await crearProducto({ nombre: 'Retirado', activo: false });

    const res = await http.get('/api/get-productos');
    expect(res.status).toBe(200);
    expect(res.body.map((item) => item.nombre)).toEqual(['Mango deshidratado']);
  });

  it('crea la portada inicial cuando todavía no hay diapositivas', async () => {
    const res = await http.get('/api/portada');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body.map((slide) => slide.titulo)).toEqual([
      'CDISFRUTA en Australia',
      'Aromáticas frutales',
      'Tradición de Ubaté',
    ]);
  });

  it('un visitante compra contraentrega, descuenta stock y recibe la referencia para reclamar el pedido', async () => {
    const producto = await crearProducto({ stock: 4, precio: 10000 });
    const compra = await http.post('/api/pedidos').send({
      productos: [{ productoId: String(producto._id), cantidad: 2 }],
      datosEnvio: envio('visita@example.com'),
      metodoPago: 'Contraentrega',
    });

    expect(compra.status).toBe(201);
    expect(compra.body.pedido.total).toBe(20000);
    expect(compra.body.guestClaimToken).toEqual(expect.any(String));
    expect((await Producto.findById(producto._id)).stock).toBe(2);

    const vacio = await http.post('/api/pedidos').send({ productos: [], datosEnvio: envio('visita@example.com') });
    expect(vacio.status).toBe(400);

    const sinStock = await http.post('/api/pedidos').send({
      productos: [{ productoId: String(producto._id), cantidad: 6 }],
      datosEnvio: envio('visita@example.com'),
    });
    expect(sinStock.status).toBe(409);
    expect((await Producto.findById(producto._id)).stock).toBe(2);

    const digital = await http.post('/api/pedidos').send({
      productos: [{ productoId: String(producto._id), cantidad: 1 }],
      datosEnvio: envio('visita@example.com'),
      metodoPago: 'CARD',
    });
    expect(digital.status).toBe(503);
  });

  it('guarda el pedido en la cuenta, deja cancelarlo en pendiente y devuelve el stock una sola vez', async () => {
    const producto = await crearProducto({ stock: 5, precio: 8000 });
    await crearCuenta({ email: 'ana@example.com' });
    await crearCuenta({ email: 'otro@example.com' });
    await crearCuenta({ email: 'admin@example.com', rol: 'admin', permisos: ['*'] });
    const ana = await entrar('ana@example.com');
    const otro = await entrar('otro@example.com');
    const admin = await entrar('admin@example.com');

    const compra = await http.post('/api/pedidos').set('Cookie', ana.cookie).send({
      productos: [{ productoId: String(producto._id), cantidad: 1 }],
      datosEnvio: envio('ana@example.com'),
    });
    expect(compra.status).toBe(201);
    expect(compra.body.guestClaimToken).toBeUndefined();
    const pedidoId = compra.body.pedido.id;

    const mios = await http.get('/api/pedidos/mis-pedidos').set('Cookie', ana.cookie);
    expect(mios.status).toBe(200);
    expect(mios.body).toHaveLength(1);

    const ajenos = await http.get('/api/pedidos/mis-pedidos').set('Cookie', otro.cookie);
    expect(ajenos.body).toHaveLength(0);

    const sinMotivo = await http.patch(`/api/pedidos/${pedidoId}/estado`).set('Cookie', ana.cookie).send({});
    expect(sinMotivo.status).toBe(400);

    const cancelado = await http.patch(`/api/pedidos/${pedidoId}/estado`).set('Cookie', ana.cookie).send({
      motivo: 'Ya no lo necesito',
    });
    expect(cancelado.status).toBe(200);
    expect(cancelado.body.pedido.estado).toBe('Cancelado');
    expect((await Producto.findById(producto._id)).stock).toBe(5);

    const otraVez = await http.patch(`/api/pedidos/${pedidoId}/estado`).set('Cookie', ana.cookie).send({
      motivo: 'Repetir',
    });
    expect(otraVez.status).toBe(409);
    expect((await Producto.findById(producto._id)).stock).toBe(5);

    const panelAjeno = await http.get('/api/admin/pedidos').set('Cookie', ana.cookie);
    expect(panelAjeno.status).toBe(403);
    const panel = await http.get('/api/admin/pedidos').set('Cookie', admin.cookie);
    expect(panel.status).toBe(200);
    expect(panel.body).toHaveLength(1);
  });

  it('administración avanza el estado y el cliente ya no puede cancelar un pedido enviado', async () => {
    const producto = await crearProducto({ stock: 3, precio: 9000 });
    await crearCuenta({ email: 'ana@example.com' });
    await crearCuenta({ email: 'admin@example.com', rol: 'admin', permisos: ['*'] });
    const ana = await entrar('ana@example.com');
    const admin = await entrar('admin@example.com');

    const compra = await http.post('/api/pedidos').set('Cookie', ana.cookie).send({
      productos: [{ productoId: String(producto._id), cantidad: 1 }],
      datosEnvio: envio('ana@example.com'),
    });
    const pedidoId = compra.body.pedido.id;

    const enviado = await http.patch(`/api/admin/pedidos/${pedidoId}/estado`).set('Cookie', admin.cookie).send({
      estado: 'Enviado',
    });
    expect(enviado.status).toBe(200);
    expect(enviado.body.pedido.estado).toBe('Enviado');
    expect((await Producto.findById(producto._id)).stock).toBe(2);

    const cancelar = await http.patch(`/api/pedidos/${pedidoId}/estado`).set('Cookie', ana.cookie).send({
      motivo: 'Cambio de opinión',
    });
    expect(cancelar.status).toBe(409);
    expect((await Producto.findById(producto._id)).stock).toBe(2);

    const avisosCliente = await http.get('/api/get-notificaciones').set('Cookie', ana.cookie);
    expect(avisosCliente.status).toBe(403);
    const avisos = await http.get('/api/get-notificaciones').set('Cookie', admin.cookie);
    expect(avisos.status).toBe(200);
    expect(avisos.body.length).toBeGreaterThan(0);

    const leida = await http.patch(`/api/notificaciones/${avisos.body[0]._id}`).set('Cookie', admin.cookie);
    expect(leida.status).toBe(200);
    const restantes = await http.get('/api/get-notificaciones').set('Cookie', admin.cookie);
    expect(restantes.body.find((aviso) => String(aviso._id) === String(avisos.body[0]._id))).toBeUndefined();
  });

  it('una cuenta verificada reclama el pedido de invitado si el correo coincide', async () => {
    const producto = await crearProducto({ stock: 2, precio: 7000 });
    await crearCuenta({ email: 'ana@example.com' });
    await crearCuenta({ email: 'otro@example.com' });
    const ana = await entrar('ana@example.com');
    const otro = await entrar('otro@example.com');

    const compra = await http.post('/api/pedidos').send({
      productos: [{ productoId: String(producto._id), cantidad: 1 }],
      datosEnvio: envio('ana@example.com'),
    });
    const { guestClaimToken } = compra.body;

    const ajeno = await http.post('/api/pedidos/reclamar').set('Cookie', otro.cookie).send({ claimToken: guestClaimToken });
    expect(ajeno.status).toBe(404);

    const propio = await http.post('/api/pedidos/reclamar').set('Cookie', ana.cookie).send({ claimToken: guestClaimToken });
    expect(propio.status).toBe(200);

    const mios = await http.get('/api/pedidos/mis-pedidos').set('Cookie', ana.cookie);
    expect(mios.body).toHaveLength(1);

    const repetido = await http.post('/api/pedidos/reclamar').set('Cookie', ana.cookie).send({ claimToken: guestClaimToken });
    expect(repetido.status).toBe(404);
  });
});
