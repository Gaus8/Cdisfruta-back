import mongoose from 'mongoose';

const productoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    required: true,
    trim: true
  },
  precio: {
    type: Number,
    required: true,
    min: 0
  },
  categoria: {
    type: String,
    required: true
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  imagen: {
    type: String, // Imagen principal de respaldo
    default: ''
  },
  imagenes: {
    type: [String], // Array para almacenar las múltiples fotos de la galería
    default: []
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  activo: {
    type: Boolean,
    default: true
  }
});

export default mongoose.model('Producto', productoSchema);