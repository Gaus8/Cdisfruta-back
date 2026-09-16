import mongoose from 'mongoose';

const pedidoSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productos: [
    {
      productoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Producto',
        required: true
      },
      nombre: { type: String, required: true },
      precio: { type: Number, required: true },
      cantidad: { type: Number, required: true, min: 1 },
      imagen: { type: String } // 👈 Agregamos esto aquí
    }
  ],
  total: {
    type: Number,
    required: true
  },
  datosEnvio: {
    nombres: { type: String, required: true },
    apellidos: { type: String, required: true },
    whatsapp: { type: String, required: true },
    departamento: { type: String, required: true },
    municipio: { type: String, required: true },
    direccion: { type: String, required: true },
    barrio: { type: String, required: true },
    correo: { type: String },
    nota: { type: String }
  },
  estado: {
    type: String,
    enum: ['Pendiente', 'Comprobado', 'Enviado', 'Entregado', 'Cancelado'],
    default: 'Pendiente'
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export default mongoose.model('Pedido', pedidoSchema);