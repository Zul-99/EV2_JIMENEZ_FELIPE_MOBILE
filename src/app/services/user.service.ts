import { Injectable, effect, signal } from '@angular/core';
import { User } from '../models/user';
import { loadFromStorage, saveToStorage } from './task.service';

const STORAGE_KEY = 'users';

@Injectable({ providedIn: 'root' })
export class UserService {
  // Se usa un signal (igual que en TaskService) para que Angular actualice la
  // pantalla apenas cambia la lista, incluso si el cambio viene de una alerta.
  // La lista parte con lo que haya guardado en localStorage.
  private readonly users = signal<User[]>(loadFromStorage<User>(STORAGE_KEY));
  // El siguiente id continúa desde el mayor guardado, para no repetir ids tras recargar.
  private nextId = Math.max(0, ...this.users().map(user => user.id)) + 1;

  constructor() {
    // Cada vez que cambia el signal, se guarda automáticamente en localStorage.
    effect(() => saveToStorage(STORAGE_KEY, this.users()));
  }

  getAll(): readonly User[] {
    return this.users();
  }

  add(nombre: string, email: string): void {
    this.users.update(users => [...users, { id: this.nextId++, nombre, email }]);
  }

  remove(id: number): void {
    this.users.update(users => users.filter(user => user.id !== id));
  }
}
