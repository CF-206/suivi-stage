export type InfoType = 'text' | 'email' | 'tel' | 'url';

export interface InfoFieldDef {
  key: string;
  label: string;
  type: InfoType;
  placeholder: string;
  required?: boolean;
}

export interface InfoCompletion {
  /** 0 -> 100 */
  pourcentage: number;
  /** nombre de champs remplis */
  remplis: number;
  /** nombre de champs attendus */
  total: number;
  /** champs manquants */
  manquants: InfoFieldDef[];
  /** le(s) champ(s) obligatoire(s) est/sont-il renseigné(s) ? */
  valide: boolean;
}

export function calculerCompletion(
  fields: InfoFieldDef[],
  values: object,
): InfoCompletion {
  const record = values as Record<string, string | undefined>;
  const manquants: InfoFieldDef[] = [];
  let remplis = 0;
  let valide = true;

  for (const field of fields) {
    const value = (record[field.key] ?? '').toString().trim();
    if (value.length > 0) {
      remplis++;
    } else {
      if (field.required) valide = false;
      else manquants.push(field);
    }
  }

  return {
    pourcentage: fields.length === 0 ? 0 : Math.round((remplis / fields.length) * 100),
    remplis,
    total: fields.length,
    manquants,
    valide,
  };
}
