import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Candidature,
  joursAvantProchaineRelance,
  relanceDue,
} from '../../../core/models/candidature';
import { completionEntreprise } from '../../../core/models/entreprise';
import { STATUT_LABELS } from '../../../core/models/candidature';
import { formatDate } from '../../../core/utils/date';
import { CompletionBar } from '../../../shared/components/completion-bar/completion-bar';

@Component({
  selector: 'app-candidature-card',
  imports: [RouterLink, CompletionBar],
  templateUrl: './candidature-card.html',
  styleUrl: './candidature-card.scss',
})
export class CandidatureCard {
  readonly candidature = input.required<Candidature>();

  protected readonly statutLabels = STATUT_LABELS;

  protected readonly relanceDue = computed(() => relanceDue(this.candidature()));

  protected readonly joursAvantRelance = computed(() =>
    joursAvantProchaineRelance(this.candidature()),
  );

  protected readonly completion = computed(() =>
    completionEntreprise(this.candidature().entreprise, this.candidature().origine),
  );

  protected initiales(entreprise: string): string {
    return entreprise
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((m) => m[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected joursRestants(dateLimit?: string): number | null {
    if (!dateLimit) return null;
    const diff = new Date(dateLimit).getTime() - Date.now();
    return Math.ceil(diff / 86_400_000);
  }

  protected fmt(iso?: string): string {
    return formatDate(iso);
  }
}
