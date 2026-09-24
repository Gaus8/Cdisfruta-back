import express from 'express';
import { getLandingSlides, updateLandingSlides } from '../controllers/productos/landingController.js';
import { verifyToken } from '../middleware/getToken.js';
import { subirImagenPortada } from '../middleware/subirImg.js';

export const routerLanding = express.Router();

const soloAdmin = (req, res, next) => {
  if (req.user?.rol !== 'admin') return res.status(403).json({ message: 'Acceso reservado para administración.' });
  next();
};

routerLanding.get('/portada', getLandingSlides);
routerLanding.put('/admin/portada', verifyToken, soloAdmin, subirImagenPortada, updateLandingSlides);
