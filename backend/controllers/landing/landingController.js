import mongoose from 'mongoose';
import LandingSlide from '../../models/landingSlideSchema.js';

const MIN_SLIDES = 1;
const MAX_SLIDES = 12;
const FIELD_LIMITS = { eyebrow: 32, etiqueta: 26, titulo: 64, desc: 180, tag: 28, detalle: 500 };
const ICON_KEYS = ['globe', 'leaf', 'location'];

const contenidoInicial = [
  { eyebrow: 'Presencia internacional', etiqueta: 'Presencia internacional', titulo: 'CDISFRUTA en Australia', desc: 'Nuestras aromáticas llegando a nuevos destinos. Sabor colombiano presente en Melbourne.', tag: 'Australia · Melbourne', detalle: 'Nuestra expansión internacional comenzó con el sueño de llevar el sabor de Ubaté al mundo. Hoy, nuestras infusiones se disfrutan en Melbourne por diversas familias, destacando por su origen natural y procesos artesanales.', img: '/img/cdisfruta_01.webp', iconKey: 'globe', orden: 0 },
  { eyebrow: 'Producto destacado', etiqueta: 'Producto destacado', titulo: 'Aromáticas frutales', desc: 'Infusiones naturales elaboradas con frutas seleccionadas, que brindan sabor, frescura y bienestar en cada taza.', tag: '100% Natural', detalle: 'Seleccionamos cada fruta en su punto exacto de maduración. Nuestro proceso de deshidratado lento conserva todas las propiedades vitamínicas y el aroma intenso que nos caracteriza.', img: '/img/cdisfruta_02.webp', iconKey: 'leaf', orden: 1 },
  { eyebrow: 'Nuestra tierra', etiqueta: 'Nuestra tierra', titulo: 'Tradición de Ubaté', desc: 'Reflejamos la riqueza de nuestra tierra en cada mezcla, con frutas y hierbas cuidadosamente seleccionadas.', tag: 'Ubaté · Cundinamarca', detalle: 'CDISFRUTA nace en el corazón de la provincia de Ubaté. Trabajamos de la mano con productores locales, asegurando frescura y apoyando el crecimiento de nuestra comunidad campesina.', img: '/img/cdisfruta_07.webp', iconKey: 'location', orden: 2 }
];

export const getLandingSlides = async (_req, res) => {
  try {
    let slides = await LandingSlide.find().sort({ orden: 1 });
    if (!slides.length) slides = await LandingSlide.insertMany(contenidoInicial);
    res.status(200).json(slides);
  } catch (error) {
    res.status(500).json({ message: 'No se pudo cargar el contenido de portada', error: error.message });
  }
};

const prepareSlide = (slide, index, uploaded) => {
  const file = uploaded.find((item) => item.fieldname === `imagen_${index}`);
  const img = file?.path || String(slide.img || '').trim();
  const values = {
    eyebrow: String(slide.eyebrow || '').trim(),
    etiqueta: String(slide.etiqueta || slide.eyebrow || '').trim(),
    titulo: String(slide.titulo || '').trim(),
    desc: String(slide.desc || '').trim(),
    tag: String(slide.tag || '').trim(),
    detalle: String(slide.detalle || '').trim(),
    iconKey: ICON_KEYS.includes(slide.iconKey) ? slide.iconKey : 'leaf',
    orden: index,
    img
  };
  const position = index + 1;
  if (!values.img || values.img.startsWith('blob:') || values.img.startsWith('data:')) {
    throw new Error(`Agrega una imagen a la diapositiva ${position}.`);
  }
  for (const [field, limit] of Object.entries(FIELD_LIMITS)) {
    if (!values[field]) throw new Error(`Completa todos los campos de la diapositiva ${position}.`);
    if (values[field].length > limit) throw new Error(`El texto de la diapositiva ${position} supera el límite permitido.`);
  }
  const id = typeof slide._id === 'string' && mongoose.Types.ObjectId.isValid(slide._id) ? slide._id : null;
  return { id, values };
};

export const updateLandingSlides = async (req, res) => {
  try {
    const slides = JSON.parse(req.body.slides || '[]');
    if (!Array.isArray(slides) || slides.length < MIN_SLIDES || slides.length > MAX_SLIDES) {
      return res.status(400).json({ message: `La portada debe tener entre ${MIN_SLIDES} y ${MAX_SLIDES} diapositivas.` });
    }
    const prepared = slides.map((slide, index) => prepareSlide(slide, index, req.files || []));
    const savedIds = [];
    for (const item of prepared) {
      const updated = item.id
        ? await LandingSlide.findByIdAndUpdate(item.id, item.values, { returnDocument: 'after', runValidators: true })
        : null;
      const doc = updated || await LandingSlide.create(item.values);
      savedIds.push(doc._id);
    }
    await LandingSlide.deleteMany({ _id: { $nin: savedIds } });
    const result = await LandingSlide.find({ _id: { $in: savedIds } }).sort({ orden: 1 });
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res.status(400).json({ message: 'El contenido de la portada no es válido.' });
    }
    res.status(400).json({ message: error.message || 'No se pudo guardar la portada.' });
  }
};
