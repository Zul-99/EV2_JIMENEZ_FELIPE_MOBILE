import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { HomePage } from './home.page';
import { TaskService } from '../services/task.service';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let service: TaskService;
  let confirmDelete: () => void;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([]), {
        provide: AlertController,
        useValue: {
          create: async (options: { buttons: Array<{ role: string; handler?: () => void }> }) => {
            confirmDelete = options.buttons.find(button => button.role === 'destructive')!.handler!;
            return { present: async () => undefined };
          },
        },
      }],
    }).compileComponents();
    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    service = TestBed.inject(TaskService);
    fixture.detectChanges();
  });

  it('updates the existing task without creating another', () => {
    service.add('Original', 'Descripción');
    const id = service.getAll()[0].id;
    component.editTask(service.getAll()[0]);
    component.title = 'Editada';
    component.description = 'Nueva descripción';
    component.addTask();
    expect(service.getAll()).toEqual([{ id, title: 'Editada', description: 'Nueva descripción' }]);
    expect(component.editingTaskId).toBeNull();
  });

  it('cancels editing without changing the task', () => {
    service.add('Original', 'Descripción');
    component.editTask(service.getAll()[0]);
    component.title = 'Cambio sin guardar';
    component.cancelEdit();
    expect(service.getAll()[0].title).toBe('Original');
    expect(component.title).toBe('');
  });

  it('renders deletion after one confirmation without another click', async () => {
    service.add('Tarea a borrar', 'Descripción');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Tarea a borrar');
    await component.deleteTask(service.getAll()[0].id);
    expect(service.getAll()).toHaveLength(1);
    confirmDelete();
    await fixture.whenStable();
    expect(service.getAll()).toHaveLength(0);
    expect(fixture.nativeElement.textContent).not.toContain('Tarea a borrar');
    expect(fixture.nativeElement.textContent).toContain('No hay tareas todavía');
  });

  it('clears editing when the edited task is deleted', async () => {
    service.add('Original', 'Descripción');
    component.editTask(service.getAll()[0]);
    await component.deleteTask(service.getAll()[0].id);
    confirmDelete();
    expect(component.editingTaskId).toBeNull();
    expect(component.title).toBe('');
  });
});
