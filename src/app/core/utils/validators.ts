import { AbstractControl, ValidationErrors } from '@angular/forms';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const TEL_RE = /^[+()\d\s.-]{6,20}$/;
const URL_RE = /^(https?:\/\/)[^\s.]+\.[^\s]{2,}$/i;

export function emailValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').toString().trim();
  if (!value) return null; // champ optionnel
  return EMAIL_RE.test(value) ? null : { email: true };
}

export function telValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').toString().trim();
  if (!value) return null;
  return TEL_RE.test(value) ? null : { tel: true };
}

export function urlValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').toString().trim();
  if (!value) return null;
  return URL_RE.test(value) ? null : { url: true };
}
