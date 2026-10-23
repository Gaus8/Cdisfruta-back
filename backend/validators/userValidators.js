import { z } from 'zod';

export const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[.!@#$%^&*])[\S]{8,16}$/;
export const passwordRuleMessage = 'Debe tener 8-16 caracteres, una mayúscula, una minúscula, un número y un símbolo (.!@#$%^&*).';
const regex = passwordRegex;
const regexNombre = /^[\p{L}\s]+$/u;

const userSchema = z.object({
  name: z.string()
    .min(6, { message: 'error1' })
    .regex(regexNombre, 'error1'),
  
  email: z.string().email({
    message: 'error2'
  }),

  password: z.string().regex(regex, { message: 'error3' }),

  // Exige que el valor sea booleano Y que sea obligatoriamente TRUE
  terminosAceptados: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar los términos y condiciones" })
  })
});

export function validateRegisterUser (input) {
  return userSchema.safeParse(input);
}

export function validateLoginUser (input) {
  // Para el login aislamos únicamente los campos requeridos (email y password)
  const loginSchema = userSchema.pick({ email: true, password: true });
  return loginSchema.safeParse(input);
}
