import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from '../../app';
import { routes } from '../../app.routes';

describe('Page Mes infos', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('affiche le formulaire quand on navigue vers /profil', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/profil');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const titre = compiled.querySelector('h2')?.textContent ?? '';
    expect(titre).toContain('Mes informations');

    const champs = compiled.querySelectorAll('.info-form input');
    expect(champs.length).toBe(9);
  });
});
