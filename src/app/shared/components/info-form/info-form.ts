import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InfoFieldDef } from '../../../core/models/info';

@Component({
  selector: 'app-info-form',
  imports: [ReactiveFormsModule],
  templateUrl: './info-form.html',
  styleUrl: './info-form.scss',
})
export class InfoForm {
  readonly control = input.required<FormGroup>();
  readonly fields = input.required<InfoFieldDef[]>();

  protected isInvalid(key: string): boolean {
    const c = this.control().get(key);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  protected errorMessage(key: string): string | null {
    const c = this.control().get(key);
    if (!c || !c.errors) return null;
    if (c.errors['required']) return 'Ce champ est obligatoire.';
    if (c.errors['email']) return "Format d'email invalide.";
    if (c.errors['tel']) return 'Numéro de téléphone invalide.';
    if (c.errors['url']) return 'URL invalide (http:// ou https:// requis).';
    return 'Valeur invalide.';
  }
}
