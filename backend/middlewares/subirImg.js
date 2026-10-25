import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

/**
 * Importante: desde el commit de “aumento de formatos” las keys dejaron de
 * ir hardcodeadas y leen process.env. En Vercel deben existir:
 * CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const IMAGE_EXTENSIONS = new Set([
  "jpg", "jpeg", "jfif", "png", "webp", "gif", "avif", "bmp", "tif", "tiff", "heic", "heif",
]);
const IMAGE_MIMES = new Set([
  "image/jpeg", "image/jpg", "image/pjpeg",
  "image/png", "image/webp", "image/gif", "image/avif",
  "image/bmp", "image/x-ms-bmp",
  "image/tiff", "image/tif",
  "image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence",
]);
const IMAGE_FORMATS_LABEL = "JPG, PNG, WebP, GIF, AVIF, BMP, TIFF o HEIC";

/** Formatos que Cloudinary acepta como entrada (sin romper la conversión a WebP). */
const ALLOWED_CLOUDINARY_FORMATS = [
  "jpg", "jpeg", "png", "webp", "gif", "bmp", "tif", "tiff", "avif", "heic", "heif",
];

const acceptImage = (_req, file, callback) => {
  const extension = file.originalname.split(".").pop()?.toLowerCase() || "";
  if (IMAGE_MIMES.has(file.mimetype) || IMAGE_EXTENSIONS.has(extension)) {
    return callback(null, true);
  }
  callback(new Error(`Formato no permitido. Usa ${IMAGE_FORMATS_LABEL}.`));
};

const assertCloudinaryEnv = (req, res, next) => {
  const missing = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]
    .filter((key) => !String(process.env[key] || "").trim());
  if (missing.length) {
    console.error("Cloudinary sin variables en el servidor:", missing.join(", "));
    return res.status(503).json({
      status: "error",
      message: "Cloudinary no está configurado en producción. Añade CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en Vercel (y redespliega).",
    });
  }
  return next();
};

const handleUploadError = (error, res, fallbackMessage) => {
  console.error("Error de subida:", error.message || error);
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ status: "error", message: "La imagen supera el tamaño máximo permitido." });
    }
    if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ status: "error", message: "Demasiadas imágenes o campo de archivo incorrecto." });
    }
    return res.status(400).json({ status: "error", message: "No se pudo procesar la imagen." });
  }
  return res.status(400).json({
    status: "error",
    message: error.message || fallbackMessage,
  });
};

const wrapUpload = (middleware, fallbackMessage) => (req, res, next) => {
  assertCloudinaryEnv(req, res, () => {
    middleware(req, res, (error) => {
      if (error) return handleUploadError(error, res, fallbackMessage);
      return next();
    });
  });
};

// Productos: formatos ampliados en el filtro; en Cloudinary se guarda como WebP.
// Sin fetch_format:auto (chocaba con format:webp y podía tumbar la subida).
const storageProductos = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "img-cdisfruta",
    allowed_formats: ALLOWED_CLOUDINARY_FORMATS,
    format: "webp",
    transformation: [{ width: 1200, crop: "limit", quality: "auto" }],
  },
});

const uploadProductos = multer({
  storage: storageProductos,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: acceptImage,
});
export const subirImg = wrapUpload(
  uploadProductos.array("imagenes", 5),
  "No se pudo subir la imagen del producto."
);

// Portada / landing
const storagePortada = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "cdisfruta-portada",
    allowed_formats: ALLOWED_CLOUDINARY_FORMATS,
    format: "webp",
    transformation: [{ width: 1600, crop: "limit", quality: "auto" }],
  },
});
const uploadPortada = multer({
  storage: storagePortada,
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter: acceptImage,
});
export const subirImagenPortada = wrapUpload(
  uploadPortada.any(),
  "No se pudo subir la imagen de portada."
);

// Avatar de perfil
const storageAvatar = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "avatars-cdisfruta",
    allowed_formats: ALLOWED_CLOUDINARY_FORMATS,
    format: "webp",
    transformation: [{ width: 300, height: 300, crop: "limit", quality: "auto" }],
  },
});

const uploadAvatar = multer({
  storage: storageAvatar,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: acceptImage,
});
export const subirAvatarPerfil = wrapUpload(
  uploadAvatar.single("avatar"),
  "No se pudo subir la imagen del perfil."
);
