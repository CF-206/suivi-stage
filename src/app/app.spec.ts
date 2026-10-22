import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the shell brand', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/candidatures');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.shell__name')?.textContent).toContain(
      'Suivi Stage',
    );
  });

  it('should render the shell only once', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/candidatures');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.shell__topbar').length).toBe(1);
    expect(compiled.querySelectorAll('.shell__nav').length).toBe(1);
  });

  it('le lien "Mes infos" du header navigue vers la page', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/candidatures');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const liens = Array.from(
      compiled.querySelectorAll('.shell__nav a'),
    ) as HTMLAnchorElement[];
    const lien = liens.find((a) => a.textContent?.includes('Mes infos'));
    expect(lien).toBeTruthy();

    lien!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toContain('/profil');
    expect(compiled.querySelector('h2')?.textContent).toContain('Mes informations');
    expect(compiled.querySelectorAll('.info-form input').length).toBe(9);
  });

  it('le logo du header ramène aux candidatures', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/profil');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const logo = compiled.querySelector('.shell__brand') as HTMLAnchorElement;

    logo.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toContain('/candidatures');
  });
});
