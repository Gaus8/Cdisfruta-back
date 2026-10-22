import mongoose from 'mongoose';

const userActivitySchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tipo: { type: String, enum: ['product_view', 'form_attempt'], required: true },
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },
  nombreProducto: { type: String, trim: true, maxlength: 160 },
  tipoFormulario: { type: String, enum: ['cart', 'quote', 'product_interest'] },
  fecha: { type: Date, default: Date.now }
}, { timestamps: true });

userActivitySchema.index({ usuario: 1, tipo: 1, fecha: -1 });

export default mongoose.model('UserActivity', userActivitySchema);
