import { Component, computed, inject, signal } from '@angular/core';
import {
  Candidature,
  STATUTS,
  STATUT_LABELS,
  StatutCandidature,
  relanceDue,
} from '../../../core/models/candidature';
import { CandidatureService } from '../../../core/services/candidature.service';
import { CandidatureCard } from '../candidature-card/candidature-card';
import { CandidatureForm } from '../candidature-form/candidature-form';

@Component({
  selector: 'app-candidature-list',
  imports: [CandidatureCard, CandidatureForm],
  templateUrl: './candidature-list.html',
  styleUrl: './candidature-list.scss',
})
export class CandidatureList {
  private readonly service = inject(CandidatureService);

  protected readonly statuts = STATUTS;
  protected readonly statutLabels = STATUT_LABELS;

  protected readonly total = this.service.total;

  /** Chargement des données depuis Supabase. */
  protected readonly chargement = this.service.chargement;

  protected readonly filtreStatut = signal<StatutCandidature | 'tous'>('tous');
  protected readonly filtreTexte = signal('');
  protected readonly filtreRelance = signal(false);

  /** Candidatures qui répondent à une offre (hors archivées). */
  protected readonly offres = computed(() =>
    this.filtrer(this.service.offres().filter((c) => c.statut !== 'archive')),
  );

  /** Candidatures envoyées de ton côté (hors archivées). */
  protected readonly spontanees = computed(() =>
    this.filtrer(this.service.spontanees().filter((c) => c.statut !== 'archive')),
  );

  /** Nombre de candidatures archivées (consultables via l'onglet dédié). */
  protected readonly nbArchivees = computed(() => this.service.archivees().length);

  protected readonly nbRelances = computed(
    () => this.service.candidatures().filter((c) => relanceDue(c)).length,
  );

  protected readonly nbRelancesOffres = computed(
    () => this.offres().filter((c) => relanceDue(c)).length,
  );

  protected readonly nbRelancesSpontanees = computed(
    () => this.spontanees().filter((c) => relanceDue(c)).length,
  );

  private filtrer(list: Candidature[]): Candidature[] {
    const texte = this.filtreTexte().toLowerCase().trim();
    const statut = this.filtreStatut();
    const seulementRelance = this.filtreRelance();

    return list.filter((c) => {
      const okStatut = statut === 'tous' || c.statut === statut;
      const okRelance = !seulementRelance || relanceDue(c);
      const okTexte =
        texte.length === 0 ||
        c.entreprise.nom.toLowerCase().includes(texte) ||
        c.poste.toLowerCase().includes(texte) ||
        c.lieu.toLowerCase().includes(texte);
      return okStatut && okRelance && okTexte;
    });
  }

  protected onStatutChange(event: Event): void {
    this.filtreStatut.set((event.target as HTMLSelectElement).value as StatutCandidature | 'tous');
  }

  protected onTexteChange(event: Event): void {
    this.filtreTexte.set((event.target as HTMLInputElement).value);
  }

  protected toggleRelance(): void {
    this.filtreRelance.update((v) => !v);
  }

  protected onSaved(candidature: Candidature): void {
    this.service.add(candidature);
  }

  protected chargerExemple(): void {
    if (
      this.total() > 0 &&
      !confirm("Remplacer la liste actuelle par la candidature d'exemple ?")
    ) {
      return;
    }
    this.service.chargerExemple();
  }
}
