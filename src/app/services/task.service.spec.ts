import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';

describe('TaskService', () => {
  let service: TaskService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add and remove tasks', () => {
    service.add('Tarea', 'Descripción');
    expect(service.getAll().length).toBe(1);
    service.remove(service.getAll()[0].id);
    expect(service.getAll().length).toBe(0);
  });

  it('should keep tasks after reloading (localStorage)', () => {
    service.add('Persistente', 'Sobrevive a la recarga');
    TestBed.tick(); // ejecuta el effect que guarda en localStorage

    // Simula recargar la app: se crea un servicio nuevo desde cero.
    TestBed.resetTestingModule();
    const reloaded = TestBed.inject(TaskService);
    expect(reloaded.getAll().map(t => t.title)).toEqual(['Persistente']);
  });
});
