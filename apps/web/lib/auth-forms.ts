export interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  accountType: string;
}

export type RegisterField = keyof RegisterFormValues;
export type RegisterFieldErrors = Partial<Record<RegisterField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export function validateRegisterFields(values: RegisterFormValues): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  if (values.accountType !== 'student' && values.accountType !== 'employer') {
    errors.accountType = 'Elige qué tipo de cuenta quieres.';
  }
  if (values.name.trim().length < 2) errors.name = 'Escribe tu nombre.';
  if (!isValidEmail(values.email)) errors.email = 'Escribe un correo válido, por ejemplo ana@correo.com.';
  if (values.password.length < 8) errors.password = 'La contraseña necesita al menos 8 caracteres.';
  if (values.confirmPassword !== values.password) errors.confirmPassword = 'Las contraseñas no coinciden.';
  return errors;
}

export const REGISTER_FIELD_ORDER: RegisterField[] = ['accountType', 'name', 'email', 'password', 'confirmPassword'];

export const MAGIC_LINK_COOLDOWN_SECONDS = 30;
