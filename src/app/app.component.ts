import { Component } from '@angular/core';
import { GameComponent } from './game/game.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GameComponent],
  template: `<app-game></app-game>`,
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'juego-puertas-alumnos';
}
