import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Candidature } from '../../core/models/candidature';
import { CandidatureService } from '../../core/services/candidature.service';
import { formatDate } from '../../core/utils/date';

@Component({
  selector: 'app-archives-page',
  imports: [RouterLink],
  templateUrl: './archives-page.html',
  styleUrl: './archives-page.scss',
})
export class ArchivesPage {
  private readonly service = inject(CandidatureService);

  protected readonly archivees = computed(() =>
    this.service.archivees().sort((a, b) => (a.dateAjout ?? '').localeCompare(b.dateAjout ?? '')),
  );

  /** Chargement des données depuis Supabase. */
  protected readonly chargement = this.service.chargement;

  protected fmt(iso?: string): string {
    return formatDate(iso);
  }

  protected initiales(entreprise: string): string {
    return entreprise
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((m) => m[0]?.toUpperCase() ?? '')
      .join('');
  }

  /** Remet une candidature dans le circuit (statut Postulé). */
  protected restaurer(c: Candidature): void {
    this.service.update(c.id, { statut: 'postule' });
  }

  /** Supprime définitivement une candidature archivée. */
  protected supprimer(c: Candidature): void {
    if (!confirm(`Supprimer définitivement « ${c.entreprise.nom} » ?`)) return;
    this.service.remove(c.id);
  }
}
