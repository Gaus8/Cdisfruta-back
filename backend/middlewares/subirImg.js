import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const ensureCloudinaryConfig = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

ensureCloudinaryConfig();

const cloudinaryConfigured = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

const uploadBufferToCloudinary = (buffer, options) =>
  new Promise((resolve, reject) => {
    ensureCloudinaryConfig();
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });
    stream.end(buffer);
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
const ALLOWED_CLOUDINARY_FORMATS = [
  "jpg", "jpeg", "png", "webp", "gif", "avif", "bmp", "tif", "tiff", "heic", "heif",
];

const acceptImage = (_req, file, callback) => {
  const extension = file.originalname.split(".").pop()?.toLowerCase() || "";
  if (IMAGE_MIMES.has(file.mimetype) || IMAGE_EXTENSIONS.has(extension)) {
    return callback(null, true);
  }
  callback(new Error(`Formato no permitido. Usa ${IMAGE_FORMATS_LABEL}.`));
};

// Productos (múltiples)
const storageProductos = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "img-cdisfruta",
    allowed_formats: ALLOWED_CLOUDINARY_FORMATS,
    format: "webp",
    transformation: [
      { width: 1200, crop: "limit" },
      { quality: "auto", fetch_format: "auto" },
    ],
  },
});

const uploadProductos = multer({
  storage: storageProductos,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: acceptImage,
});
export const subirImg = uploadProductos.array("imagenes", 5);

// Portada / landing
const storagePortada = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "cdisfruta-portada",
    allowed_formats: ALLOWED_CLOUDINARY_FORMATS,
    format: "webp",
  },
});
const uploadPortada = multer({
  storage: storagePortada,
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter: acceptImage,
});
export const subirImagenPortada = uploadPortada.any();

// Avatar: memoria + upload_stream (Vercel no permite temp disk como entorno local).
const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: acceptImage,
});

/** Multer en memoria + Cloudinary; errores controlados para no devolver 500 opacos. */
export const subirAvatarPerfil = (req, res, next) => {
  uploadAvatar.single("avatar")(req, res, async (error) => {
    if (error) {
      console.error("Error al leer avatar:", error.message || error);
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ status: "error", message: "La imagen supera el máximo de 5 MB." });
        }
        return res.status(400).json({ status: "error", message: "No se pudo procesar la imagen del perfil." });
      }
      return res.status(400).json({
        status: "error",
        message: error.message || "No se pudo subir la imagen del perfil.",
      });
    }

    if (!req.file) return next();

    if (!cloudinaryConfigured()) {
      return res.status(503).json({
        status: "error",
        message: "Cloudinary no está configurado en el servidor. Revisa CLOUDINARY_* en Vercel.",
      });
    }

    try {
      const uploaded = await uploadBufferToCloudinary(req.file.buffer, {
        folder: "avatars-cdisfruta",
        resource_type: "image",
        format: "webp",
        transformation: [{ width: 300, height: 300, crop: "limit" }],
      });
      req.file.path = uploaded.secure_url;
      req.file.secure_url = uploaded.secure_url;
      return next();
    } catch (uploadError) {
      console.error("Error Cloudinary avatar:", uploadError.message || uploadError);
      return res.status(502).json({
        status: "error",
        message: "No se pudo guardar la imagen en Cloudinary. Inténtalo de nuevo.",
      });
    }
  });
};
