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
    enum: ["admin", "user"], 
    default: "user"
  },
  avatar: {
    type: String,
    default: ""
  },
  telefono: {
    type: String,
    default: ""
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
  terminosAceptados: {
    type: Boolean,
    required: true
  }
});

export default mongoose.model('User', userSchema);
