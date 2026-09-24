import mongoose from 'mongoose';

const landingSlideSchema = new mongoose.Schema({
  eyebrow: { type: String, required: true, trim: true, maxlength: 32 },
  etiqueta: { type: String, required: true, trim: true, maxlength: 26 },
  titulo: { type: String, required: true, trim: true, maxlength: 64 },
  desc: { type: String, required: true, trim: true, maxlength: 180 },
  tag: { type: String, required: true, trim: true, maxlength: 28 },
  detalle: { type: String, required: true, trim: true, maxlength: 500 },
  img: { type: String, required: true },
  iconKey: { type: String, enum: ['globe', 'leaf', 'location'], default: 'leaf' },
  orden: { type: Number, required: true }
}, { timestamps: true });

export default mongoose.model('LandingSlide', landingSlideSchema);
