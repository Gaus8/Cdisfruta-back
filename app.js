import express from 'express';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import { connectionDb } from './db/connection.js';
import { routerUsuarios } from './backend/router/userRoutes.js';
// import { routerProducts } from './backend/router/productRoutes.js';
import cors from 'cors';
import { routerProductos } from './backend/router/productRoutes.js';

const corsOptions = {
  origin: [
    'http://localhost:5173', 
    'https://cdisfruta.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};  


const app = express();

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

app.use('/api',routerUsuarios)
app.use('/api',routerProductos)
app.set('trust proxy', 1);
app.get('/',(req,res) =>{
  res.send("El servidor esta funcionando")
})

app.post('/api/logout', (req, res) => {
  res.clearCookie('access_token');
  res.status(200).json({ message: 'Sesión cerrada' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectionDb(); // Asegurarte de esperar la conexión
  app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
  });
};


startServer();
