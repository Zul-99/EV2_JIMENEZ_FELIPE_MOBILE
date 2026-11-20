import { Injectable, signal } from '@angular/core';
import { Task } from '../models/task'; 

@Injectable({ providedIn: 'root'})
export class TaskService {
    private readonly tasks = signal<Task[]>([]);
    private nextId = Date.now();

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

