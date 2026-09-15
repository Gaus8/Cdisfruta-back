import express from 'express';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';

// Importaciones de Rutas 
import { connectionDb } from './db/connection.js';
import { routerNotificaciones } from './backend/router/notificacionesRouter.js';
import { routerUsuarios } from './backend/router/userRoutes.js'; 
import { routerProductos } from './backend/router/productRoutes.js';
import routerPedidos from './backend/router/pedidosRoutes.js'; // <-- Importado sin llaves

const corsOptions = {
  origin: [
    'http://localhost:5173', 
    'https://cdisfruta.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};  

const app = express();
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

// Registro de Rutas con prefijo /api
app.use('/api', routerUsuarios);
app.use('/api', routerProductos);
app.use('/api', routerNotificaciones); 
app.use('/api', routerPedidos); // Registro de las rutas de pedidos

app.get('/', (req, res) => {
  res.send("El servidor de Cdisfruta está funcionando");
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });

  return res.status(200).json({ status: 'success', message: 'Sesión cerrada' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectionDb(); 
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("No se pudo iniciar el servidor:", error);
  }
};

startServer();

export default app;