/** Politique mot de passe côté serveur */

const MIN_LENGTH = 8;

export function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < MIN_LENGTH) {
    return `Mot de passe : ${MIN_LENGTH} caractères minimum.`;
  }
  if (!/[A-Z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une majuscule.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Le mot de passe doit contenir au moins un chiffre.';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Le mot de passe doit contenir au moins un caractère spécial.';
  }
  return null;
}
