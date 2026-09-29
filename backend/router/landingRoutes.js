import express from 'express';
import { getLandingSlides, updateLandingSlides } from '../controllers/productos/landingController.js';
import { verifyToken } from '../middleware/getToken.js';
import { subirImagenPortada } from '../middleware/subirImg.js';
import { requireAdmin } from '../middleware/rbac.js';

export const routerLanding = express.Router();

routerLanding.get('/portada', getLandingSlides);
routerLanding.put('/admin/portada', verifyToken, requireAdmin, subirImagenPortada, updateLandingSlides);
