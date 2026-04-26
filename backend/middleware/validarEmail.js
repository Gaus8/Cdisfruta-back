import crypto from 'crypto';
import nodemailer from 'nodemailer';
import 'dotenv/config';

export const generarTokenVerificacion = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const enviarCorreoVerificacion = async (usuario, token) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const verificationUrl = `http://localhost:5000/${token}`;

  const mailOptions = {
    from: `"SIECU - Plataforma gestionada a CDISFRUTA" <${process.env.EMAIL_USER}>`,
    to: usuario.email,
    subject: 'Confirmación de correo electrónico - Registro en CDISFRUTA',
    html: `
      <p>Estimado(a) ${usuario.name},</p>
      <p>Gracias por registrarse en <b>SIECU</b>.</p>
      <p>Para activar su cuenta haga clic aquí:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <br><br>
      <p>Si no realizó este registro, ignore este mensaje.</p>
    `
  };

  return transporter.sendMail(mailOptions);
};
