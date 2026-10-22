import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  // Le layout (Shell) est fourni par les routes : la racine ne fait qu'héberger l'outlet.
  template: '<router-outlet />',
})
export class App {}
