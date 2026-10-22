import {
  Component,
  ElementRef,
  computed,
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Candidature,
  OrigineCandidature,
  STATUTS,
  STATUT_LABELS,
  StatutCandidature,
  candidatureVide,
} from '../../../core/models/candidature';
import {
  ENTREPRISE_FIELDS,
  Entreprise,
  champsEntreprise,
  entrepriseVide,
} from '../../../core/models/entreprise';
import { PROFIL_FIELDS, Profil, completionProfil, profilVide } from '../../../core/models/profil';
import { calculerCompletion } from '../../../core/models/info';
import { CandidatureService } from '../../../core/services/candidature.service';
import { ProfilService } from '../../../core/services/profil.service';
import { InfoFormGroup, createInfoGroup, readInfo } from '../../../core/utils/info-form';
import { InfoForm } from '../../../shared/components/info-form/info-form';
import { CompletionBar } from '../../../shared/components/completion-bar/completion-bar';

@Component({
  selector: 'app-candidature-form',
  imports: [ReactiveFormsModule, InfoForm, CompletionBar],
  templateUrl: './candidature-form.html',
  styleUrl: './candidature-form.scss',
})
export class CandidatureForm {
  /** Candidature existante (édition) ou null (création). */
  readonly existing = input<Candidature | null>(null);

  /** 'offre' = réponse à une offre, 'spontanee' = candidature de ton côté. */
  readonly origine = input<OrigineCandidature>('offre');

  readonly saved = output<Candidature>();
  readonly closed = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly profilService = inject(ProfilService);
  private readonly candidatureService = inject(CandidatureService);

  protected readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly statuts = STATUTS;
  protected readonly statutLabels = STATUT_LABELS;
  protected readonly profilFields = PROFIL_FIELDS;

  /** Champs entreprise affichés selon l'origine de la candidature. */
  protected readonly entrepriseFields = computed(() => champsEntreprise(this.origineEffective()));

  /** En édition, l'origine vient de la candidature existante. */
  protected readonly origineEffective = computed<OrigineCandidature>(
    () => this.existing()?.origine ?? this.origine(),
  );

  /** Entreprise retrouvée automatiquement (infos réutilisées). */
  protected readonly entrepriseReconnue = signal<string | null>(null);

  protected readonly form = new FormGroup({
    entreprise: createInfoGroup(this.fb, ENTREPRISE_FIELDS),
    poste: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    lieu: new FormControl('', { nonNullable: true }),
    type: new FormControl('', { nonNullable: true }),
    dateLimit: new FormControl('', { nonNullable: true }),
    dateDepot: new FormControl('', { nonNullable: true }),
    lien: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    statut: new FormControl<StatutCandidature>('nouveau', { nonNullable: true }),
    candidat: createInfoGroup(this.fb, PROFIL_FIELDS),
  });

  protected readonly entrepriseGroup = this.form.get('entreprise') as InfoFormGroup;
  protected readonly profilGroup = this.form.get('candidat') as InfoFormGroup;

  protected readonly completionEntreprise = () =>
    calculerCompletion(this.entrepriseFields(), readInfo(this.entrepriseGroup));

  protected readonly completionProfil = () =>
    completionProfil(readInfo(this.profilGroup) as unknown as Profil);

  constructor() {
    effect(() => {
      const existing = this.existing();
      const origine = this.origineEffective();
      const entreprise: Entreprise = existing?.entreprise ?? entrepriseVide();
      const profil: Profil = existing?.candidat ?? this.profilService.profil();

      this.setInfo(this.entrepriseGroup, entreprise as unknown as Record<string, string>);
      this.setInfo(this.profilGroup, profil as unknown as Record<string, string>);

      const aujourdhui = new Date().toISOString().slice(0, 10);

      // Le poste est obligatoire pour une offre, optionnel pour une spontanée.
      const posteCtrl = this.form.get('poste');
      posteCtrl?.setValidators(origine === 'spontanee' ? [] : [Validators.required]);
      posteCtrl?.updateValueAndValidity({ emitEvent: false });

      this.form.patchValue({
        poste: existing?.poste ?? '',
        lieu: existing?.lieu ?? '',
        type: existing?.type ?? '',
        // Pour une candidature spontanée, l'envoi part d'aujourd'hui.
        dateDepot: existing?.dateDepot ?? (origine === 'spontanee' ? aujourdhui : ''),
        dateLimit: existing?.dateLimit ?? '',
        lien: existing?.lien ?? '',
        notes: existing?.notes ?? '',
        statut: existing?.statut ?? 'nouveau',
      });
    });

    // Quand l'utilisateur tape un nom d'entreprise déjà connu, on récupère les infos.
    this.entrepriseGroup.controls['nom']?.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((nom: string) => {
        if (this.existing()) return;
        const connue = this.candidatureService.entrepriseConnue(nom ?? '');
        if (!connue) {
          this.entrepriseReconnue.set(null);
          return;
        }
        this.entrepriseReconnue.set(connue.nom);
        this.setInfo(this.entrepriseGroup, connue as unknown as Record<string, string>, ['nom']);
      });
  }

  open(): void {
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
    this.closed.emit();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.entrepriseGroup.markAllAsTouched();
      this.profilGroup.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const entreprise = {
      ...entrepriseVide(),
      ...(readInfo(this.entrepriseGroup) as unknown as Entreprise),
    };
    const profil = {
      ...profilVide(),
      ...(readInfo(this.profilGroup) as unknown as Profil),
    };

    // Mon profil global reste à jour.
    this.profilService.replace(profil);

    const base = this.existing() ?? candidatureVide(entreprise, profil, this.origineEffective());
    const candidature: Candidature = {
      ...base,
      origine: this.origineEffective(),
      entreprise,
      poste: value.poste.trim(),
      lieu: value.lieu.trim(),
      type: value.type.trim(),
      dateLimit: value.dateLimit,
      dateDepot: value.dateDepot,
      lien: value.lien.trim(),
      notes: value.notes.trim(),
      statut: value.statut,
      candidat: profil,
    };

    this.saved.emit(candidature);
    this.close();
  }

  private setInfo(group: InfoFormGroup, values: Record<string, string>, skip: string[] = []): void {
    for (const [key, control] of Object.entries(group.controls)) {
      if (skip.includes(key)) continue;
      control.setValue(values[key] ?? '', { emitEvent: false });
    }
  }
}
