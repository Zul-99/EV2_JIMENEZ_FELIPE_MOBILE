import { Injectable, effect, signal } from '@angular/core';
import { Task } from '../models/task';

const STORAGE_KEY = 'tasks';

@Injectable({ providedIn: 'root'})
export class TaskService {
    // La lista parte con lo que haya guardado en localStorage (o vacía).
    private readonly tasks = signal<Task[]>(loadFromStorage<Task>(STORAGE_KEY));
    private nextId = Date.now();

    constructor() {
        // Cada vez que cambia el signal, se guarda automáticamente en localStorage.
        effect(() => saveToStorage(STORAGE_KEY, this.tasks()));
    }

    getAll(): Task[] {
        return this.tasks();
    }

    add(title: string, description: string): void {
        const newTask: Task = { id: this.nextId++, title, description };
        this.tasks.update(tasks => [...tasks, newTask]);
    }

    remove(id: number): void {
        this.tasks.update(tasks => tasks.filter(task => task.id !== id));
    }

    update(task: Task): void {
        this.tasks.update(tasks => tasks.map(t => t.id === task.id ? { ...task } : t));
    }

}

/** Lee una lista desde localStorage. Si no hay nada o el JSON está dañado, devuelve []. */
export function loadFromStorage<T>(key: string): T[] {
    try {
        const data = JSON.parse(localStorage.getItem(key) ?? '[]');
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

/** Guarda una lista en localStorage como JSON. */
export function saveToStorage<T>(key: string, items: readonly T[]): void {
    try {
        localStorage.setItem(key, JSON.stringify(items));
    } catch {
        // Si el almacenamiento no está disponible (modo privado, sin espacio), la app sigue funcionando en memoria.
    }
}
