export class IpcValidationError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = 'IpcValidationError';
    this.issues = issues;
  }
}

type ValidationOptions = {
  allowZero?: boolean;
  required?: boolean;
  maxLength?: number;
};

function invalid(label: string, reason: string): never {
  throw new IpcValidationError(`${label}: ${reason}`, [`${label}: ${reason}`]);
}

export function assertObject<T extends Record<string, unknown>>(value: unknown, label: string): T {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    invalid(label, 'objet attendu');
  }
  return value as T;
}

export function assertArray<T = unknown>(value: unknown, label: string, minLength = 0): T[] {
  if (!Array.isArray(value)) {
    invalid(label, 'liste attendue');
  }
  if (value.length < minLength) {
    invalid(label, `au moins ${minLength} élément(s) attendu(s)`);
  }
  return value as T[];
}

export function assertPositiveInteger(value: unknown, label: string, options: ValidationOptions = {}): number {
  if (!Number.isInteger(value)) {
    invalid(label, 'entier attendu');
  }

  const min = options.allowZero ? 0 : 1;
  if ((value as number) < min) {
    invalid(label, options.allowZero ? 'doit être supérieur ou égal à 0' : 'doit être strictement positif');
  }

  return value as number;
}

export function assertFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    invalid(label, 'nombre fini attendu');
  }
  return value;
}

export function assertPositiveNumber(
  value: unknown,
  label: string,
  options: Pick<ValidationOptions, 'allowZero'> = {},
): number {
  const parsed = assertFiniteNumber(value, label);
  const min = options.allowZero ? 0 : Number.EPSILON;
  if (parsed < min) {
    invalid(label, options.allowZero ? 'doit être supérieur ou égal à 0' : 'doit être strictement positif');
  }
  return parsed;
}

export function assertAmount(value: unknown, label: string): number {
  return assertPositiveNumber(value, label, { allowZero: true });
}

export function assertPercentage(value: unknown, label: string): number {
  const parsed = assertFiniteNumber(value, label);
  if (parsed < 0 || parsed > 100) {
    invalid(label, 'doit être compris entre 0 et 100');
  }
  return parsed;
}

export function assertDateJournal(value: unknown, label = 'dateJournal'): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    invalid(label, 'format YYYY-MM-DD attendu');
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    invalid(label, 'date invalide');
  }

  return value;
}

export function assertMonth(value: unknown, label = 'mois'): number {
  const month = assertPositiveInteger(value, label);
  if (month > 12) {
    invalid(label, 'doit être compris entre 1 et 12');
  }
  return month;
}

export function assertYear(value: unknown, label = 'annee'): number {
  const year = assertPositiveInteger(value, label);
  if (year < 2020 || year > 2100) {
    invalid(label, 'doit être compris entre 2020 et 2100');
  }
  return year;
}

export function assertText(value: unknown, label: string, options: ValidationOptions = {}): string {
  if (value === null || value === undefined || value === '') {
    if (options.required) invalid(label, 'champ obligatoire');
    return '';
  }

  if (typeof value !== 'string') {
    invalid(label, 'texte attendu');
  }

  const trimmed = value.trim();
  if (options.required && trimmed.length === 0) {
    invalid(label, 'champ obligatoire');
  }
  if (options.maxLength !== undefined && trimmed.length > options.maxLength) {
    invalid(label, `maximum ${options.maxLength} caractères`);
  }

  return trimmed;
}

export function assertEnum<T extends string>(value: unknown, label: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    invalid(label, `valeur autorisée attendue: ${allowed.join(', ')}`);
  }
  return value as T;
}
