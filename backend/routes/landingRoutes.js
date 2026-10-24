import express from 'express';
import { getLandingSlides, updateLandingSlides } from '../controllers/landing/landingController.js';
import { verifyToken } from '../middlewares/getToken.js';
import { subirImagenPortada } from '../middlewares/subirImg.js';
import { requirePermission } from '../middlewares/rbac.js';

export const routerLanding = express.Router();

routerLanding.get('/portada', getLandingSlides);
routerLanding.put('/admin/portada', verifyToken, requirePermission('landing:write'), subirImagenPortada, updateLandingSlides);
