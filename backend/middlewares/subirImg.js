import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

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

// Avatar de perfil
const storageAvatar = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "avatars-cdisfruta",
    allowed_formats: ALLOWED_CLOUDINARY_FORMATS,
    format: "webp",
    transformation: [{ width: 300, height: 300, crop: "limit" }],
  },
});

const uploadAvatar = multer({
  storage: storageAvatar,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: acceptImage,
});
export const subirAvatarPerfil = uploadAvatar.single("avatar");
