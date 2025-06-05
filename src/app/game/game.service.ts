import { Injectable } from '@angular/core';

// --- Definiciones de Premios ---
export enum PremioCategoria {
  BUENO = 'PREMIOS BUENOS',
  MAS_O_MENOS = 'PREMIOS MAS O MENOS',
  NO_TAN_BUENO = 'NO TAN BUENOS',
}

export interface Premio {
  texto: string;
  categoria: PremioCategoria;
}

// Definición de todos los premios disponibles
const ALL_PRIZES: Premio[] = [
  // PREMIOS BUENOS (menor probabilidad)
  { texto: 'La Miss corrige tu peor nota', categoria: PremioCategoria.BUENO },
  {
    texto: 'No haces la tarea más cara del parcial',
    categoria: PremioCategoria.BUENO,
  },
  { texto: '5 puntos extra', categoria: PremioCategoria.BUENO },
  {
    texto:
      'Usar a la Miss de comodín para la pregunta que quieras de la siguiente evaluación',
    categoria: PremioCategoria.BUENO,
  },

  // PREMIOS MÁS O MENOS (probabilidad media)
  { texto: '1 punto para todos', categoria: PremioCategoria.MAS_O_MENOS },
  {
    texto: '1 día más para entregar la tarea que quieras',
    categoria: PremioCategoria.MAS_O_MENOS,
  },
  {
    texto: 'Usar el cuaderno por un minuto en la siguiente evaluación',
    categoria: PremioCategoria.MAS_O_MENOS,
  },

  // NO TAN BUENOS (mayor probabilidad)
  { texto: 'Gracias por participar', categoria: PremioCategoria.NO_TAN_BUENO },
  {
    texto: 'Resolver examen con una pista',
    categoria: PremioCategoria.NO_TAN_BUENO,
  },
];

// Interfaz para el registro de cada partida jugada
interface GameResult {
  id: string;
  numeroLista: number | null;
  nombre: string;
  puertaElegida: number;
  premioObtenido: Premio;
  premiosEnJuego: Premio[];
  fechaJuego: string;
}

// Interfaz para el estado de cada puerta individual
interface Door {
  id: number;
  premio: Premio | null;
  isSelected: boolean;
  isOpen: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private _currentAlumno: { numeroLista: number | null; nombre: string } = {
    numeroLista: null,
    nombre: '',
  };
  private _doors: Door[] = [];
  private _gameResults: GameResult[] = [];

  private _selectedDoorIndex: number | null = null;
  private _currentPrizesInPlay: Premio[] = []; // Premios seleccionados para el juego actual

  constructor() {
    const storedResults = localStorage.getItem('gameResults');
    if (storedResults) {
      try {
        this._gameResults = JSON.parse(storedResults);
        console.log(
          'Resultados cargados desde localStorage:',
          this._gameResults.length,
          'registros.'
        );
      } catch (e) {
        console.error('Error al parsear resultados de localStorage:', e);
        this._gameResults = [];
      }
    }
  }

  initializeGame(alumno: { numeroLista: number | null; nombre: string }): void {
    this._currentAlumno = { ...alumno };
    this._doors = [];
    this._selectedDoorIndex = null;
    this._currentPrizesInPlay = this.selectRandomPrizes(3); // Selecciona 3 premios aleatorios y únicos

    // Asigna los premios seleccionados a las puertas de forma aleatoria
    const shuffledPrizeIndices = this.shuffleArray([0, 1, 2]);

    for (let i = 0; i < 3; i++) {
      this._doors.push({
        id: i,
        premio: this._currentPrizesInPlay[shuffledPrizeIndices[i]],
        isSelected: false,
        isOpen: false,
      });
    }
    console.log(
      'Premios en las puertas (ordenados aleatoriamente):',
      this._doors.map((d) => `P${d.id + 1}: ${d.premio?.texto}`)
    );
  }

  // --- NUEVA LÓGICA DE SELECCIÓN DE PREMIOS PONDERADA ---
  private selectRandomPrizes(count: number): Premio[] {
    const selected: Premio[] = [];
    const availablePrizes = [...ALL_PRIZES];

    // Define los pesos para cada categoría (puedes ajustarlos)
    const categoryWeights = {
      [PremioCategoria.BUENO]: 25, // 25%
      [PremioCategoria.MAS_O_MENOS]: 30, // 30%
      [PremioCategoria.NO_TAN_BUENO]: 45, // 45%
    };

    // Calcular el total de pesos
    const totalWeight = Object.values(categoryWeights).reduce(
      (sum, weight) => sum + weight,
      0
    );

    while (selected.length < count && availablePrizes.length > 0) {
      const rand = Math.random() * totalWeight;
      let cumulativeWeight = 0;
      let selectedCategory: PremioCategoria | null = null;

      // Determinar la categoría basándose en el número aleatorio y los pesos
      for (const category in categoryWeights) {
        cumulativeWeight += categoryWeights[category as PremioCategoria];
        if (rand < cumulativeWeight) {
          selectedCategory = category as PremioCategoria;
          break;
        }
      }

      // Si no se pudo seleccionar una categoría (muy improbable con la lógica anterior)
      if (!selectedCategory) {
        selectedCategory = PremioCategoria.NO_TAN_BUENO; // Fallback
      }

      // Filtrar premios disponibles por la categoría seleccionada
      const prizesInCategory = availablePrizes.filter(
        (p) => p.categoria === selectedCategory
      );

      if (prizesInCategory.length > 0) {
        // Seleccionar un premio aleatorio de esa categoría
        const prizeIndex = Math.floor(Math.random() * prizesInCategory.length);
        const prize = prizesInCategory[prizeIndex];

        // Asegurarse de que el premio no haya sido seleccionado ya en este juego
        if (!selected.includes(prize)) {
          selected.push(prize);
        } else {
          const indexToRemove = availablePrizes.indexOf(prize);
          if (indexToRemove > -1) {
            availablePrizes.splice(indexToRemove, 1);
          }
        }
      } else {
        availablePrizes.splice(
          0,
          availablePrizes.length,
          ...availablePrizes.filter((p) => p.categoria !== selectedCategory)
        );
        if (availablePrizes.length === 0) break; // Si no quedan premios, salir
      }
    }

    while (selected.length < count && ALL_PRIZES.length > 0) {
      const remainingPrizes = ALL_PRIZES.filter((p) => !selected.includes(p));
      if (remainingPrizes.length === 0) break;
      const randomIndex = Math.floor(Math.random() * remainingPrizes.length);
      selected.push(remainingPrizes[randomIndex]);
    }

    return selected;
  }

  // Función para barajar un array (algoritmo de Fisher-Yates)
  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  getDoorsState(): Door[] {
    return this._doors.map((door) => ({ ...door }));
  }

  selectDoor(index: number): void {
    if (index < 0 || index >= this._doors.length) {
      console.error('Índice de puerta inválido al seleccionar:', index);
      return;
    }
    this._doors.forEach((door) => (door.isSelected = false));
    this._doors[index].isSelected = true;
    this._selectedDoorIndex = index;
    console.log(`Alumno seleccionó la puerta ${index + 1}.`);
  }

  openSelectedDoor(): void {
    if (this._selectedDoorIndex === null) {
      console.warn('No hay puerta seleccionada para abrir.');
      return;
    }
    this._doors[this._selectedDoorIndex].isOpen = true;
    console.log(
      `Abriendo la puerta seleccionada (${this._selectedDoorIndex + 1}).`
    );
  }

  revealAllDoors(): void {
    this._doors.forEach((door) => (door.isOpen = true));
    console.log('Todas las puertas han sido reveladas.');
  }

  // Ahora devuelve el objeto Premio directamente
  checkResult(): { premio: Premio | null; selectedDoorId: number } {
    if (this._selectedDoorIndex === null) {
      throw new Error(
        'No se ha seleccionado ninguna puerta para verificar el resultado.'
      );
    }
    const selectedDoor = this._doors[this._selectedDoorIndex];
    console.log(
      `Verificando resultado: Puerta ${selectedDoor.id + 1} (${
        selectedDoor.premio?.texto || 'No hay premio'
      })`
    );
    return { premio: selectedDoor.premio, selectedDoorId: selectedDoor.id };
  }

  addGameResult(premioObtenido: Premio | null): void {
    if (
      this._currentAlumno.numeroLista === null ||
      this._currentAlumno.nombre === ''
    ) {
      console.error(
        'Datos de alumno incompletos, no se puede guardar el resultado.'
      );
      return;
    }
    if (this._selectedDoorIndex === null) {
      console.error(
        'No se ha seleccionado ninguna puerta para guardar el resultado.'
      );
      return;
    }

    const result: GameResult = {
      id: new Date().getTime().toString(),
      numeroLista: this._currentAlumno.numeroLista,
      nombre: this._currentAlumno.nombre,
      puertaElegida: this._selectedDoorIndex,
      premioObtenido: premioObtenido || {
        texto: 'Sin premio',
        categoria: PremioCategoria.NO_TAN_BUENO,
      }, // Asegura un premio incluso si es null
      premiosEnJuego: this._currentPrizesInPlay, // Guarda los 3 premios que estaban en juego
      fechaJuego: new Date().toISOString(),
    };
    this._gameResults.push(result);
    this.saveResultsToLocalStorage();
    console.log('Resultado del juego añadido y guardado:', result);
  }

  private saveResultsToLocalStorage(): void {
    localStorage.setItem('gameResults', JSON.stringify(this._gameResults));
  }

  downloadResultsAsJson(): void {
    if (this._gameResults.length === 0) {
      alert('No hay resultados para descargar todavía.');
      return;
    }
    const dataStr = JSON.stringify(this._gameResults, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    a.download = `resultados_juego_${timestamp}.json`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    console.log('Iniciando descarga de resultados JSON.');
  }

  clearAllResults(): void {
    if (
      confirm(
        '¿Estás seguro de que quieres borrar TODOS los resultados? Esta acción es irreversible.'
      )
    ) {
      this._gameResults = [];
      localStorage.removeItem('gameResults');
      console.log('Todos los resultados han sido borrados de localStorage.');
      alert('Todos los resultados han sido borrados.');
    }
  }
}
