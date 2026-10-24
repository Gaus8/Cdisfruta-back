import express from 'express';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import morgan from 'morgan';

// Importaciones de Rutas 
import { connectionDb, ensureDb } from './backend/config/database.js';
import { routerNotificaciones } from './backend/routes/notificationRoutes.js';
import { routerUsuarios } from './backend/routes/authRoutes.js';
import { routerProductos } from './backend/routes/productRoutes.js';
import routerPedidos from './backend/routes/orderRoutes.js'; // <-- Importado sin llaves
import { routerLanding } from './backend/routes/landingRoutes.js';
import { sessionCookieOptions } from './backend/utils/sessionCookie.js';

const allowedOrigins = [
  'http://localhost:5173',
  'https://cdisfruta.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Permite herramientas sin Origin (Postman, health checks) y orígenes listados
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS bloqueado para origen: ${origin}`));
  },
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
app.use(morgan('dev'));

app.use(async (req, res, next) => {
  try {
    await ensureDb();
    next();
  } catch (error) {
    res.status(503).json({ valid: false, status: 'error', message: 'No se pudo conectar con la base de datos.' });
  }
});

// Registro de Rutas con prefijo /api
app.use('/api/auth', routerUsuarios);
app.use('/api', routerProductos);
app.use('/api', routerNotificaciones); 
app.use('/api', routerPedidos); // Registro de las rutas de pedidos
app.use('/api', routerLanding);

app.get('/', (req, res) => {
  res.send("El servidor de Cdisfruta está funcionando");
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('access_token', sessionCookieOptions());

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
    console.error("No se pudo iniciar el servidor porque MongoDB no está disponible:", error.message);
    process.exitCode = 1;
  }
};

if (!process.env.VERCEL) startServer();

export default app;
