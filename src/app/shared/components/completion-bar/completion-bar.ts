import { Component, computed, input } from '@angular/core';
import { InfoCompletion } from '../../../core/models/info';

@Component({
  selector: 'app-completion-bar',
  templateUrl: './completion-bar.html',
  styleUrl: './completion-bar.scss',
})
export class CompletionBar {
  readonly completion = input.required<InfoCompletion>();
  readonly compact = input(false);

  protected readonly niveau = computed(() => {
    const p = this.completion().pourcentage;
    if (p >= 100) return 'complet';
    if (p >= 70) return 'bon';
    if (p >= 40) return 'moyen';
    return 'faible';
  });

  protected readonly libelle = computed(() => {
    const c = this.completion();
    if (c.pourcentage >= 100) return 'Tout est renseigné 🎉';
    if (c.manquants.length === 0) return 'Tout est renseigné';
    return `Il manque ${c.manquants.length} info(s)`;
  });
}
