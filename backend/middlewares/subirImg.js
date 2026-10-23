import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

cloudinary.config({
  cloud_name: "ddydemm9u",
  api_key: "167396583177692",
  api_secret: "MThRV65WznH9BLOLrYwFaqLEDME"
});

// 📦 Configuración para imágenes de productos (Múltiples)
const storageProductos = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "img-cdisfruta",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const uploadProductos = multer({
  storage: storageProductos,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, callback) => {
    if (["image/jpeg", "image/png"].includes(file.mimetype)) return callback(null, true);
    callback(new Error("Formato no permitido. Usa JPG o PNG."));
  }
});
export const subirImg = uploadProductos.array("imagenes", 5);

const portadaExtensions = new Set(["jpg", "jpeg", "jfif", "png", "webp", "gif", "avif", "bmp", "tif", "tiff", "heic", "heif"]);
const portadaMimes = new Set([
  "image/jpeg", "image/jpg", "image/pjpeg",
  "image/png", "image/webp", "image/gif", "image/avif",
  "image/bmp", "image/x-ms-bmp",
  "image/tiff", "image/tif",
  "image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"
]);
const storagePortada = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "cdisfruta-portada",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "avif", "bmp", "tif", "tiff", "heic", "heif"],
    format: "webp",
  },
});
const uploadPortada = multer({
  storage: storagePortada,
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, callback) => {
    const extension = file.originalname.split(".").pop()?.toLowerCase() || "";
    if (portadaMimes.has(file.mimetype) || portadaExtensions.has(extension)) return callback(null, true);
    callback(new Error("Formato no permitido. Usa JPG, PNG, WebP, GIF, AVIF, BMP, TIFF o HEIC."));
  }
});
export const subirImagenPortada = uploadPortada.any();


// 📦 Configuración exclusiva para el Avatar del usuario (Única imagen)
const storageAvatar = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "avatars-cdisfruta", // Carpeta independiente para orden
    allowed_formats: ["jpg", "png", "jpeg"],
    transformation: [{ width: 300, height: 300, crop: "limit" }] // Opcional: optimizar tamaño
  },
});

const uploadAvatar = multer({ storage: storageAvatar });
export const subirAvatarPerfil = uploadAvatar.single("avatar"); // 👈 Espera un campo llamado 'avatar'
