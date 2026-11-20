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
});
