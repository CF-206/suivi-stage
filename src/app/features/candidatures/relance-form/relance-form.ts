import {
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Candidature } from '../../../core/models/candidature';
import { ProfilService } from '../../../core/services/profil.service';
import { RelanceService } from '../../../core/services/relance.service';
import { emailValidator } from '../../../core/utils/validators';
import { construireRelance, mailtoLink } from '../../../core/utils/relance';

@Component({
  selector: 'app-relance-form',
  imports: [ReactiveFormsModule],
  templateUrl: './relance-form.html',
  styleUrl: './relance-form.scss',
})
export class RelanceForm {
  /** Candidature à relancer. */
  readonly candidature = input<Candidature | null>(null);

  /** Émis quand la relance est marquée comme envoyée. */
  readonly relanceEnvoyee = output<Candidature>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly profilService = inject(ProfilService);

  /** Envoi direct du mail au recruteur. */
  protected readonly relanceService = inject(RelanceService);

  protected readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly form = new FormGroup({
    destinataire: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, emailValidator],
    }),
    objet: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    corps: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected readonly copie = signal(false);

  constructor() {
    effect(() => {
      const c = this.candidature();
      if (!c) return;
      const relance = construireRelance(c, this.profilService.profil());
      this.form.patchValue({
        destinataire: relance.destinataire,
        objet: relance.objet,
        corps: relance.corps,
      });
    });
  }

  open(): void {
    this.copie.set(false);
    this.relanceService.message.set(null);
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  protected readonly lienMailto = () => mailtoLink(this.form.getRawValue());

  /**
   * Prépare l'envoi du mail de relance en générant un lien mailto.
   * L'utilisateur peut cliquer sur "Ouvrir dans Outlook" ou le lien apparaitra.
   * Si l'envoi réussit, la relance est marquée comme envoyée.
   */
  protected async envoyerMail(): Promise<void> {
    const c = this.candidature();
    if (!c) return;

    const profil = this.profilService.profil();
    const resultat = await this.relanceService.preparer(c, profil);

    if (resultat.ok) {
      this.relanceService.message.set({ ok: true, texte: resultat.texte });
      this.marquer(c);
    } else {
      this.relanceService.message.set({ ok: false, texte: resultat.texte });
    }
  }

  protected async copier(): Promise<void> {
    const { corps } = this.form.getRawValue();
    try {
      await navigator.clipboard.writeText(corps);
      this.copie.set(true);
      setTimeout(() => this.copie.set(false), 2500);
    } catch {
      /* presse-papiers indisponible */
    }
  }

  protected marquerEnvoyee(): void {
    const c = this.candidature();
    if (!c) return;
    this.marquer(c);
    this.close();
  }

  /** Signale la relance comme envoyée (date + compteur). */
  private marquer(c: Candidature): void {
    this.relanceEnvoyee.emit({
      ...c,
      dateRelance: new Date().toISOString(),
      nbRelances: (c.nbRelances ?? 0) + 1,
    });
  }
}
