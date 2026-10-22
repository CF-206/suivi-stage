import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { candidatureVide } from '../../../core/models/candidature';
import { entrepriseVide } from '../../../core/models/entreprise';
import { CandidatureService } from '../../../core/services/candidature.service';
import { CandidatureList } from './candidature-list';

describe('CandidatureList', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [CandidatureList],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  function serviceVide(): CandidatureService {
    const service = TestBed.inject(CandidatureService);
    service.clear();
    return service;
  }

  it("affiche la candidature d'exemple au premier lancement", async () => {
    const fixture = TestBed.createComponent(CandidatureList);
    await fixture.whenStable();

    const cartes = fixture.nativeElement.querySelectorAll('.card');
    expect(cartes.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Capgemini');
  });

  it('affiche une carte par candidature ajoutée', async () => {
    const service = serviceVide();
    const c = candidatureVide({ ...entrepriseVide(), nom: 'OVHcloud' }, undefined, 'offre');
    c.poste = 'Développeur Web Angular';
    service.add(c);

    const fixture = TestBed.createComponent(CandidatureList);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('.card').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('OVHcloud');
  });

  it('sépare les spontanées dans la seconde section', async () => {
    const service = serviceVide();

    const offre = candidatureVide({ ...entrepriseVide(), nom: 'Capgemini' }, undefined, 'offre');
    offre.poste = 'Dev Angular';
    service.add(offre);

    const spontanee = candidatureVide(
      { ...entrepriseVide(), nom: 'Esker' },
      undefined,
      'spontanee',
    );
    service.add(spontanee);

    const fixture = TestBed.createComponent(CandidatureList);
    await fixture.whenStable();

    const spontanees = fixture.nativeElement.querySelector('.section--spontanee')
      .textContent as string;
    expect(spontanees).toContain('Esker');
    expect(spontanees).not.toContain('Capgemini');
  });

  it('peut tout effacer', async () => {
    const service = serviceVide();
    service.add(candidatureVide({ ...entrepriseVide(), nom: 'Capgemini' }, undefined, 'offre'));

    const fixture = TestBed.createComponent(CandidatureList);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.card').length).toBe(1);

    service.clear();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.card').length).toBe(0);
  });

  it('masque les candidatures archivées de la liste', async () => {
    const service = serviceVide();

    const visible = candidatureVide({ ...entrepriseVide(), nom: 'Capgemini' }, undefined, 'offre');
    service.add(visible);

    const archivee = candidatureVide(
      { ...entrepriseVide(), nom: 'Lille Métropole' },
      undefined,
      'offre',
    );
    archivee.statut = 'archive';
    service.add(archivee);

    const fixture = TestBed.createComponent(CandidatureList);
    await fixture.whenStable();

    const cartes = fixture.nativeElement.querySelectorAll('.card');
    expect(cartes.length).toBe(1);
    expect(fixture.nativeElement.textContent).not.toContain('Lille Métropole');
  });
});
