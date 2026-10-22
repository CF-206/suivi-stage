import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from '../../app';
import { routes } from '../../app.routes';

describe('Page Connexion', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('affiche le formulaire de connexion', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/connexion');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.auth__brandname')?.textContent).toContain('Suivi Stage');
    expect(compiled.querySelector('h1')).toBeTruthy();
    expect(compiled.querySelector('#email')).toBeTruthy();
    expect(compiled.querySelector('#motDePasse')).toBeTruthy();
  });

  it('bascule entre connexion et inscription', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/connexion');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const onglets = Array.from(compiled.querySelectorAll('.auth__tab')) as HTMLButtonElement[];

    expect(compiled.querySelector('h1')?.textContent).toContain('Content de te revoir');

    onglets[1].click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelector('h1')?.textContent).toContain('Crée ton compte');
    expect(compiled.querySelector('button[type="submit"]')?.textContent).toContain(
      'Créer mon compte',
    );
  });

  it('laisse passer en mode local (Supabase non configuré)', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/candidatures');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toContain('/candidatures');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Mode local');
  });
});
