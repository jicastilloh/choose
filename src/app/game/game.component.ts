import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { GameService, Premio, PremioCategoria } from './game.service';

interface AlumnoData {
  numeroLista: number | null;
  nombre: string;
}
interface Door {
  id: number;
  premio: Premio | null;
  isSelected: boolean;
  isOpen: boolean;
}

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css'],
})
export class GameComponent implements OnInit {
  gameState: 'input' | 'playing' | 'result' = 'input';

  alumnoForm: FormGroup;
  currentAlumno: AlumnoData = { numeroLista: null, nombre: '' };

  doors: Door[] = [];
  gameMessage: string = '';

  constructor(private fb: FormBuilder, private gameService: GameService) {
    this.alumnoForm = this.fb.group({
      numeroLista: [
        null,
        [
          Validators.required,
          Validators.min(1),
          Validators.pattern(/^[0-9]+$/),
        ],
      ],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  ngOnInit(): void {}

  startNewGame(): void {
    if (this.alumnoForm.valid) {
      this.currentAlumno.numeroLista =
        this.alumnoForm.get('numeroLista')?.value;
      this.currentAlumno.nombre = this.alumnoForm.get('nombre')?.value;

      this.gameService.initializeGame(this.currentAlumno);
      this.doors = this.gameService.getDoorsState();
      this.gameMessage = `¡Hola ${this.currentAlumno.nombre}! Elige una puerta.`;
      this.gameState = 'playing';
    } else {
      this.gameMessage = 'Por favor, completa todos los campos correctamente.';
      this.alumnoForm.markAllAsTouched();
    }
  }

  chooseDoor(index: number): void {
    if (this.gameState === 'playing' && !this.doors[index].isOpen) {
      this.gameService.selectDoor(index);
      this.doors = this.gameService.getDoorsState();

      this.revealResult();
    }
  }

  revealResult(): void {
    this.gameService.openSelectedDoor();
    this.gameService.revealAllDoors();
    this.doors = this.gameService.getDoorsState();

    const { premio, selectedDoorId } = this.gameService.checkResult();

    if (premio && premio.categoria === PremioCategoria.BUENO) {
      this.gameMessage = `¡Felicidades, ${this.currentAlumno.nombre}, has ganado: "${premio.texto}"! 🎉`;
    } else if (premio && premio.categoria === PremioCategoria.MAS_O_MENOS) {
      this.gameMessage = `¡Bien, ${this.currentAlumno.nombre}! Tu premio es: "${premio.texto}"! 👍`;
    } else if (premio && premio.categoria === PremioCategoria.NO_TAN_BUENO) {
      this.gameMessage = `Vaya, ${this.currentAlumno.nombre}, tu premio es: "${premio.texto}". ¡Mejor suerte la próxima! 😔`;
    } else {
      this.gameMessage = `¡Qué raro, ${this.currentAlumno.nombre}! Parece que no hubo premio.`;
    }

    this.gameService.addGameResult(premio);

    this.gameState = 'result';
  }

  resetGame(): void {
    this.alumnoForm.reset();
    this.currentAlumno = { numeroLista: null, nombre: '' };
    this.gameMessage = '';
    this.doors = [];
    this.gameState = 'input';
  }

  downloadResults(): void {
    this.gameService.downloadResultsAsJson();
  }

  clearAllResults(): void {
    this.gameService.clearAllResults();
  }
}
