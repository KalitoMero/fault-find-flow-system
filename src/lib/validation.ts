import { z } from 'zod';

/**
 * Validation schemas for form inputs
 * Uses zod for runtime type validation and error messages
 */

// Error Report Validation
export const errorReportSchema = z.object({
  orderNumber: z.string()
    .trim()
    .min(1, 'Ba-Nr. ist erforderlich')
    .max(50, 'Ba-Nr. darf maximal 50 Zeichen lang sein'),
  
  afoNumber: z.string()
    .trim()
    .min(1, 'AFO-Nummer ist erforderlich')
    .max(50, 'AFO-Nummer darf maximal 50 Zeichen lang sein'),
  
  defectiveQuantity: z.number()
    .int('Menge muss eine ganze Zahl sein')
    .positive('Menge muss positiv sein')
    .max(999999, 'Menge ist zu groß'),
  
  problemDescription: z.string()
    .trim()
    .min(10, 'Problembeschreibung muss mindestens 10 Zeichen lang sein')
    .max(2000, 'Problembeschreibung darf maximal 2000 Zeichen lang sein'),
  
  correctiveAction: z.string()
    .trim()
    .max(2000, 'Korrekturmaßnahme darf maximal 2000 Zeichen lang sein')
    .optional()
    .or(z.literal('')),
  
  machine: z.string()
    .trim()
    .max(100, 'Feststellort darf maximal 100 Zeichen lang sein')
    .optional()
    .or(z.literal('')),
});

// User/Account Creation Validation
export const accountCreationSchema = z.object({
  email: z.string()
    .trim()
    .email('Ungültige E-Mail-Adresse')
    .max(255, 'E-Mail-Adresse ist zu lang'),
  
  password: z.string()
    .min(4, 'Passwort muss mindestens 4 Zeichen lang sein')
    .max(100, 'Passwort ist zu lang')
    .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
    .regex(/[a-z]/, 'Passwort muss mindestens einen Kleinbuchstaben enthalten')
    .regex(/[0-9]/, 'Passwort muss mindestens eine Zahl enthalten'),
  
  name: z.string()
    .trim()
    .min(2, 'Name muss mindestens 2 Zeichen lang sein')
    .max(100, 'Name darf maximal 100 Zeichen lang sein'),
});

// Settings/Department/Machine Names
export const nameSchema = z.string()
  .trim()
  .min(1, 'Name ist erforderlich')
  .max(100, 'Name darf maximal 100 Zeichen lang sein');

// Export type inference helpers
export type ErrorReportInput = z.infer<typeof errorReportSchema>;
export type AccountCreationInput = z.infer<typeof accountCreationSchema>;
