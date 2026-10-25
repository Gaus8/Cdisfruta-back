import crypto from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Pedido from '../backend/models/pedidoSchema.js';
import Producto from '../backend/models/productsSchema.js';
import { crearProducto, envio, http, limpiarDb } from './helpers.js';

const PUB = 'pub_test_cdisfruta_vitest_public_key_xxx';
const PRV = 'prv_test_cdisfruta_vitest_private_key_xxx';
const INTEGRITY = 'test_integrity_cdisfruta_vitest_secret';
const EVENTS = 'test_events_cdisfruta_vitest_secret';

const activarWompiTest = () => {
  process.env.WOMPI_PUBLIC_KEY = PUB;
  process.env.WOMPI_PRIVATE_KEY = PRV;
  process.env.WOMPI_INTEGRITY_SECRET = INTEGRITY;
  process.env.WOMPI_EVENTS_SECRET = EVENTS;
  process.env.FRONTEND_URL = 'https://cdisfruta.vercel.app';
};

const apagarWompiTest = () => {
  process.env.WOMPI_PUBLIC_KEY = '';
  process.env.WOMPI_PRIVATE_KEY = '';
  process.env.WOMPI_INTEGRITY_SECRET = '';
  process.env.WOMPI_EVENTS_SECRET = '';
};

const firmaIntegridad = (reference, amountInCents) =>
  crypto.createHash('sha256').update(`${reference}${amountInCents}COP${INTEGRITY}`).digest('hex');

const firmarEvento = (data, properties, timestamp) => {
  const values = properties.map((path) => path.split('.').reduce((value, key) => value?.[key], data));
  return crypto.createHash('sha256').update(`${values.join('')}${timestamp}${EVENTS}`).digest('hex').toUpperCase();
};

const eventoWompi = (transaction, properties = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents']) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const data = { transaction };
  return {
    event: 'transaction.updated',
    environment: 'test',
    timestamp,
    data,
    signature: {
      properties,
      checksum: firmarEvento(data, properties, timestamp),
    },
  };
};

describe('Wompi (checkout, webhook y consulta)', () => {
  beforeEach(async () => {
    await limpiarDb();
    activarWompiTest();
  });

  afterEach(() => {
    apagarWompiTest();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('con llaves sandbox arma el checkout CARD con firma de integridad correcta', async () => {
    const producto = await crearProducto({ stock: 3, precio: 15000 });

    const res = await http.post('/api/pedidos').send({
      productos: [{ productoId: String(producto._id), cantidad: 2 }],
      datosEnvio: envio('pago@example.com'),
      metodoPago: 'CARD',
    });

    expect(res.status).toBe(201);
    expect(res.body.checkout?.url).toBe('https://checkout.wompi.co/p/');
    const fields = res.body.checkout.fields;
    expect(fields['public-key']).toBe(PUB);
    expect(fields.currency).toBe('COP');
    // 15.000 COP × 2 = 30.000 COP → 3.000.000 centavos (formato Wompi).
    expect(fields['amount-in-cents']).toBe(3_000_000);
    expect(fields.reference).toMatch(/^CDIS/);
    expect(fields['signature:integrity']).toBe(firmaIntegridad(fields.reference, 3_000_000));
    expect(fields['redirect-url']).toContain('https://cdisfruta.vercel.app/pago/resultado');
    expect(fields['redirect-url']).toContain(`reference=${encodeURIComponent(fields.reference)}`);

    const pedido = await Pedido.findOne({ referenciaPago: fields.reference });
    expect(pedido).toBeTruthy();
    expect(pedido.metodoPago).toBe('CARD');
    expect(pedido.estadoPago).toBe('PENDIENTE');
    expect(pedido.estado).toBe('Pendiente');
    expect((await Producto.findById(producto._id)).stock).toBe(1);
  });

  it('con NEQUI también genera checkout y rechaza llaves que no sean sandbox en test', async () => {
    const producto = await crearProducto({ stock: 2, precio: 10000 });
    const ok = await http.post('/api/pedidos').send({
      productos: [{ productoId: String(producto._id), cantidad: 1 }],
      datosEnvio: envio('nequi@example.com'),
      metodoPago: 'NEQUI',
    });
    expect(ok.status).toBe(201);
    expect(ok.body.checkout.fields['amount-in-cents']).toBe(1_000_000);
    expect(ok.body.checkout.fields['signature:integrity']).toBe(
      firmaIntegridad(ok.body.checkout.fields.reference, 1_000_000)
    );

    process.env.WOMPI_PUBLIC_KEY = 'pub_prod_no_permitida_en_test';
    const bloqueado = await http.post('/api/pedidos').send({
      productos: [{ productoId: String(producto._id), cantidad: 1 }],
      datosEnvio: envio('nequi2@example.com'),
      metodoPago: 'NEQUI',
    });
    expect(bloqueado.status).toBe(503);
    expect(bloqueado.body.message).toMatch(/Sandbox|pub_test_/i);
  });

  it('el webhook con firma válida marca APPROVED y pasa el pedido a Comprobado', async () => {
    const producto = await crearProducto({ stock: 4, precio: 12000 });
    const compra = await http.post('/api/pedidos').send({
      productos: [{ productoId: String(producto._id), cantidad: 1 }],
      datosEnvio: envio('ok@example.com'),
      metodoPago: 'CARD',
    });
    const reference = compra.body.checkout.fields.reference;
    const amountInCents = compra.body.checkout.fields['amount-in-cents'];

    const body = eventoWompi({
      id: 'txn_test_approved_001',
      status: 'APPROVED',
      currency: 'COP',
      reference,
      amount_in_cents: amountInCents,
      payment_method_type: 'CARD',
    });

    const webhook = await http.post('/api/pagos/wompi/webhook').send(body);
    expect(webhook.status).toBe(200);
    expect(webhook.body.status).toBe('success');

    const pedido = await Pedido.findOne({ referenciaPago: reference });
    expect(pedido.estadoPago).toBe('APPROVED');
    expect(pedido.estado).toBe('Comprobado');
    expect(pedido.idTransaccionWompi).toBe('txn_test_approved_001');
    expect((await Producto.findById(producto._id)).stock).toBe(3);
  });

  it('el webhook rechaza checksum inválido y con DECLINED cancela y devuelve stock', async () => {
    const producto = await crearProducto({ stock: 5, precio: 8000 });
    const compra = await http.post('/api/pedidos').send({
      productos: [{ productoId: String(producto._id), cantidad: 2 }],
      datosEnvio: envio('fail@example.com'),
      metodoPago: 'NEQUI',
    });
    const reference = compra.body.checkout.fields.reference;
    const amountInCents = compra.body.checkout.fields['amount-in-cents'];
    expect((await Producto.findById(producto._id)).stock).toBe(3);

    const falso = eventoWompi({
      id: 'txn_bad_sig',
      status: 'APPROVED',
      currency: 'COP',
      reference,
      amount_in_cents: amountInCents,
      payment_method_type: 'NEQUI',
    });
    falso.signature.checksum = '0'.repeat(64);
    const rechazado = await http.post('/api/pagos/wompi/webhook').send(falso);
    expect(rechazado.status).toBe(401);

    const declined = eventoWompi({
      id: 'txn_test_declined_001',
      status: 'DECLINED',
      currency: 'COP',
      reference,
      amount_in_cents: amountInCents,
      payment_method_type: 'NEQUI',
    });
    const webhook = await http.post('/api/pagos/wompi/webhook').send(declined);
    expect(webhook.status).toBe(200);

    const pedido = await Pedido.findOne({ referenciaPago: reference });
    expect(pedido.estadoPago).toBe('DECLINED');
    expect(pedido.estado).toBe('Cancelado');
    expect(pedido.stockDescontado).toBe(false);
    expect((await Producto.findById(producto._id)).stock).toBe(5);
  });

  it('consultar estado-pago usa la API de Wompi (mock) y sincroniza el pedido', async () => {
    const producto = await crearProducto({ stock: 2, precio: 5000 });
    const compra = await http.post('/api/pedidos').send({
      productos: [{ productoId: String(producto._id), cantidad: 1 }],
      datosEnvio: envio('poll@example.com'),
      metodoPago: 'CARD',
    });
    const reference = compra.body.checkout.fields.reference;
    const amountInCents = compra.body.checkout.fields['amount-in-cents'];
    const transactionId = 'txn_poll_approved_99';

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: {
            id: transactionId,
            status: 'APPROVED',
            currency: 'COP',
            reference,
            amount_in_cents: amountInCents,
            payment_method_type: 'CARD',
          },
        }),
      }))
    );

    const res = await http.get('/api/pedidos/estado-pago').query({ reference, id: transactionId });
    expect(res.status).toBe(200);
    expect(res.body.estadoPago).toBe('APPROVED');
    expect(fetch).toHaveBeenCalledWith(
      `https://sandbox.wompi.co/v1/transactions/${transactionId}`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${PRV}` }),
      })
    );

    const pedido = await Pedido.findOne({ referenciaPago: reference });
    expect(pedido.estadoPago).toBe('APPROVED');
    expect(pedido.estado).toBe('Comprobado');
  });
});
