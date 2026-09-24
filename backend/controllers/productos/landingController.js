import LandingSlide from '../../schema/landingSlideSchema.js';

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

export const updateLandingSlides = async (req, res) => {
  try {
    const slides = JSON.parse(req.body.slides || '[]');
    if (!Array.isArray(slides) || slides.length !== 3) {
      return res.status(400).json({ message: 'La portada debe incluir exactamente tres diapositivas.' });
    }
    const uploaded = req.files || [];
    const valuesToSave = slides.map((slide, index) => {
      const file = uploaded.find((item) => item.fieldname === `imagen_${index}`);
      const values = {
        eyebrow: String(slide.eyebrow || '').trim(), etiqueta: String(slide.etiqueta || slide.eyebrow || '').trim(), titulo: String(slide.titulo || '').trim(),
        desc: String(slide.desc || '').trim(), tag: String(slide.tag || '').trim(),
        detalle: String(slide.detalle || '').trim(), iconKey: slide.iconKey,
        orden: index, img: file?.path || slide.img
      };
      if (Object.values(values).some((value) => typeof value === 'string' && !value.trim())) {
        throw new Error(`Completa todos los campos de la diapositiva ${index + 1}.`);
      }
      return values;
    });
    const result = await Promise.all(valuesToSave.map((values, index) => LandingSlide.findOneAndUpdate(
      { orden: index }, values, { new: true, upsert: true, runValidators: true }
    )));
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message || 'No se pudo guardar la portada.' });
  }
};
