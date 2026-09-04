import { z } from 'zod';

const regex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[.!@#$%^&*])[\S]{8,16}$/;
const regexNombre = /^[a-zA-Z\s]+$/;

const userSchema = z.object({
  name: z.string()
    .min(6, { message: 'error1' })
    .regex(regexNombre, 'error1'),
  
  email: z.string().email({
    message: 'error2'
  }),

  password: z.string().regex(regex, { message: 'error3' }),

  // Agregamos la validación del booleano para los términos
  terminosAceptados: z.boolean({
    required_error: "Debes aceptar los términos y condiciones",
    invalid_type_error: "Formato inválido para los términos"
  })
});

export function validateRegisterUser (input) {
  return userSchema.safeParse(input);
};

export function validateLoginUser (input) {
  // partial() hace que en el login no sea obligatorio enviar nombre ni terminos
  return userSchema.partial().safeParse(input);
}