# Configuración de Wompi

El checkout digital usa Web Checkout de Wompi. Las llaves privadas, el secreto de integridad y el secreto de eventos se configuran solamente en el `.env` del backend; nunca deben agregarse al frontend.

Variables requeridas:

- `WOMPI_PUBLIC_KEY`: llave pública `pub_test_...` para pruebas o `pub_prod_...` para producción.
- `WOMPI_PRIVATE_KEY`: llave privada del mismo ambiente; el backend la usa para consultar el resultado al regresar del checkout.
- `WOMPI_INTEGRITY_SECRET`: secreto de firma de integridad para generar el checkout.
- `WOMPI_EVENTS_SECRET`: secreto de eventos para verificar la firma del webhook.
- `FRONTEND_URL`: origen público del frontend, usado en la URL de retorno.

En el dashboard de Wompi configura el evento `transaction.updated` con la URL pública HTTPS `https://<dominio-del-backend>/api/pagos/wompi/webhook`. Configura por separado las URL y llaves de sandbox y producción. Habilita Nequi y tarjetas en el comercio; el pedido guarda el medio escogido y sólo acepta eventos cuyo método, referencia, moneda e importe coincidan.

El pago contra entrega no usa Wompi y mantiene la confirmación actual por WhatsApp. La opción de envío gratis no incrementa el total. Para probar pagos digitales usa llaves sandbox; no uses llaves de producción en desarrollo.
