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

const uploadProductos = multer({ storage: storageProductos });
export const subirImg = uploadProductos.array("imagenes", 5);


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