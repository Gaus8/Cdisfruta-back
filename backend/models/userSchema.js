import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  rol: {
    type: String,
    enum: ["admin", "user", "logistica", "catalogo"],
    default: "user"
  },
  permisos: { type: [String], default: [] },
  avatar: {
    type: String,
    default: ""
  },
  telefono: {
    type: String,
    default: ""
  },
  // Dirección predeterminada (espejo de la última usada / seleccionada).
  direccionEnvio: {
    type: new mongoose.Schema({
      nombres: { type: String, default: '' },
      apellidos: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
      departamento: { type: String, default: '' },
      municipio: { type: String, default: '' },
      direccion: { type: String, default: '' },
      barrio: { type: String, default: '' },
    }, { _id: false }),
    default: () => ({}),
  },
  // Direcciones guardadas para elegirlas en el carrito sin rellenar el formulario.
  direccionesEnvio: {
    type: [{
      etiqueta: { type: String, default: 'Casa', trim: true },
      nombres: { type: String, default: '' },
      apellidos: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
      departamento: { type: String, default: '' },
      municipio: { type: String, default: '' },
      direccion: { type: String, default: '' },
      barrio: { type: String, default: '' },
    }],
    default: [],
  },
  preferenciasAdmin: {
    type: new mongoose.Schema({
      notificarPedidos: { type: Boolean, default: true },
      notificarInventario: { type: Boolean, default: true },
      notificarCatalogo: { type: Boolean, default: true },
      umbralStockCritico: { type: Number, default: 5, min: 0, max: 10000 }
    }, { _id: false }),
    default: () => ({})
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  verificado: {
    type: Boolean,
    default: false
  },
  codigo_verificacion: String,
  verificationEmailLastSentAt: { type: Date, default: null },
  terminosAceptados: {
    type: Boolean,
    required: true
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
