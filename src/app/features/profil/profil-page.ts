import { Component, effect, inject, signal, untracked } from '@angular/core';
import { NonNullableFormBuilder } from '@angular/forms';
import { PROFIL_FIELDS, Profil } from '../../core/models/profil';
import { MailjetService } from '../../core/services/mailjet.service';
import { ProfilService } from '../../core/services/profil.service';
import { InfoFormGroup, createInfoGroup, readInfo } from '../../core/utils/info-form';
import { InfoForm } from '../../shared/components/info-form/info-form';
import { CompletionBar } from '../../shared/components/completion-bar/completion-bar';
import { MailjetConfig } from '../../shared/components/mailjet-config/mailjet-config';

@Component({
  selector: 'app-profil-page',
  imports: [InfoForm, CompletionBar, MailjetConfig],
  templateUrl: './profil-page.html',
  styleUrl: './profil-page.scss',
})
export class ProfilPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly profilService = inject(ProfilService);
  private readonly mailjetService = inject(MailjetService);

  protected readonly completion = this.profilService.completion;
  protected readonly fields = PROFIL_FIELDS;

  protected readonly profilGroup: InfoFormGroup = createInfoGroup(
    this.fb,
    PROFIL_FIELDS,
    this.profilService.profil(),
  );

  protected readonly saved = signal(false);

  constructor() {
    // Le profil peut arriver après l'affichage (chargement depuis Supabase) :
    // on remplit le formulaire, sauf s'il a déjà été modifié.
    effect(() => {
      const profil = this.profilService.profil();
      untracked(() => {
        if (this.profilGroup.dirty) return;
        this.profilGroup.reset(profil as unknown as Record<string, string>);
      });
    });

    // On charge le compte Mailjet personnel (s'il existe).
    void this.mailjetService.charger();
  }

  protected save(): void {
    if (this.profilGroup.invalid) {
      this.profilGroup.markAllAsTouched();
      return;
    }
    this.profilService.replace(readInfo(this.profilGroup) as unknown as Profil);
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 3000);
  }

  protected reset(): void {
    this.profilService.reset();
    this.profilGroup.reset();
  }
}
