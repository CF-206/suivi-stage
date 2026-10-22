import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { InfoFieldDef } from '../models/info';
import { emailValidator, telValidator, urlValidator } from './validators';

export function infoValidators(
  type: 'text' | 'email' | 'tel' | 'url',
  required?: boolean,
): ValidatorFn[] {
  const validators: ValidatorFn[] = [];
  if (required) validators.push(Validators.required);
  if (type === 'email') validators.push(emailValidator);
  if (type === 'tel') validators.push(telValidator);
  if (type === 'url') validators.push(urlValidator);
  return validators;
}

export type InfoFormGroup = FormGroup<Record<string, FormControl<string>>>;

/** Crée un FormGroup à partir d'une liste de champs info. */
export function createInfoGroup(
  fb: NonNullableFormBuilder,
  fields: InfoFieldDef[],
  initial: object = {},
): InfoFormGroup {
  const record = initial as Record<string, string | undefined>;
  const controls: Record<string, FormControl<string>> = {};
  for (const field of fields) {
    controls[field.key] = fb.control(
      record[field.key] ?? '',
      infoValidators(field.type, field.required),
    );
  }
  return new FormGroup(controls);
}

/** Convertit la valeur brute du groupe en objet (Record<string, string>). */
export function readInfo(group: InfoFormGroup | FormGroup): Record<string, string> {
  const raw = group.getRawValue() as Record<string, string>;
  const result: Record<string, string> = {};
  for (const key of Object.keys(raw)) {
    result[key] = (raw[key] ?? '').toString();
  }
  return result;
}
