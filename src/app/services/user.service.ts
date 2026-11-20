import { Injectable, signal } from '@angular/core';
import { User } from '../models/user';

@Injectable({ providedIn: 'root' })
export class UserService {
  // Se usa un signal (igual que en TaskService) para que Angular actualice la
  // pantalla apenas cambia la lista, incluso si el cambio viene de una alerta.
  private readonly users = signal<User[]>([]);
  private nextId = 1;

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
