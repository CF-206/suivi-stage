import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
  Candidature,
  STATUTS,
  STATUT_LABELS,
  StatutCandidature,
  joursAvantProchaineRelance,
  prochaineRelance,
  relanceDue,
} from '../../../core/models/candidature';
import { completionEntreprise, entrepriseVide } from '../../../core/models/entreprise';
import { nomRecruteur } from '../../../core/models/entreprise';
import { completionProfil } from '../../../core/models/profil';
import { formatDate } from '../../../core/utils/date';
import { CandidatureService } from '../../../core/services/candidature.service';
import { ProfilService } from '../../../core/services/profil.service';
import { CompletionBar } from '../../../shared/components/completion-bar/completion-bar';
import { CandidatureForm } from '../candidature-form/candidature-form';
import { RelanceForm } from '../relance-form/relance-form';

@Component({
  selector: 'app-candidature-detail',
  imports: [RouterLink, CompletionBar, CandidatureForm, RelanceForm],
  templateUrl: './candidature-detail.html',
  styleUrl: './candidature-detail.scss',
})
export class CandidatureDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(CandidatureService);
  private readonly profilService = inject(ProfilService);

  protected readonly statuts = STATUTS;
  protected readonly statutLabels = STATUT_LABELS;

  private readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')), {
    initialValue: '',
  });

  protected readonly candidature = computed<Candidature | undefined>(() =>
    this.service.candidatures().find((c) => c.id === this.id()),
  );

  protected readonly profilActuel = this.profilService.profil;

  protected readonly notFound = computed(
    () => this.id().length > 0 && !this.candidature() && !this.service.chargement(),
  );

  protected readonly completionEntreprise = computed(() => {
    const c = this.candidature();
    return completionEntreprise(c?.entreprise ?? entrepriseVide());
  });

  protected readonly completionProfilCandidat = computed(() => {
    const c = this.candidature();
    return completionProfil(c?.candidat ?? this.profilActuel());
  });

  /** Nom du recruteur (prénom + nom) s'il est renseigné. */
  protected readonly recruteur = computed(() => {
    const c = this.candidature();
    return c ? nomRecruteur(c.entreprise) : '';
  });

  protected readonly relanceDue = computed(() => {
    const c = this.candidature();
    return c ? relanceDue(c) : false;
  });

  protected readonly prochaineRelance = computed(() => {
    const c = this.candidature();
    return c ? prochaineRelance(c) : null;
  });

  protected readonly joursAvantRelance = computed(() => {
    const c = this.candidature();
    return c ? joursAvantProchaineRelance(c) : null;
  });

  protected onStatutChange(event: Event): void {
    const statut = (event.target as HTMLSelectElement).value as StatutCandidature;
    this.service.setStatut(this.id(), statut);
  }

  protected onSaved(candidature: Candidature): void {
    this.service.update(candidature.id, candidature);
  }

  protected onRelanceEnvoyee(candidature: Candidature): void {
    this.service.update(candidature.id, {
      dateRelance: candidature.dateRelance,
      nbRelances: candidature.nbRelances,
    });
  }

  protected remove(): void {
    if (!confirm('Supprimer cette candidature ?')) return;
    this.service.remove(this.id());
    this.router.navigate(['/candidatures']);
  }

  protected syncProfil(): void {
    const c = this.candidature();
    if (!c) return;
    this.service.update(c.id, { candidat: { ...this.profilActuel() } });
  }

  protected initiales(entreprise: string): string {
    return entreprise
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((m) => m[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected fmt(iso?: string): string {
    return formatDate(iso);
  }
}
