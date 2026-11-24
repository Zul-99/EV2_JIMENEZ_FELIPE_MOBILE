import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { HomePage, formatearPrecision } from './home.page';
import { TaskService } from '../services/task.service';
import { LocationService, Ubicacion } from '../services/location.service';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let service: TaskService;
  let confirmDelete: () => void;
  let ubicacionFalsa: () => Promise<Ubicacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([]), {
        provide: LocationService,
        useValue: {
          obtenerMejorUbicacion: () => ubicacionFalsa(),
          soloUbicacionAproximada: async () => false,
        },
      }, {
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

  it('rejects a title made only of spaces', () => {
    component.title = '    ';
    expect(component.puedeGuardar).toBe(false);
    expect(component.errorTarea).toContain('solo espacios');
    component.addTask();
    expect(service.getAll()).toHaveLength(0);
  });

  it('rejects texts longer than the maximum', () => {
    component.title = 'x'.repeat(61);
    expect(component.errorTarea).toContain('máximo 60');
    component.title = 'Ok';
    component.description = 'x'.repeat(201);
    expect(component.errorTarea).toContain('máximo 200');
    component.addTask();
    expect(service.getAll()).toHaveLength(0);
  });

  it('shows the photo location as a Google Maps link caption', async () => {
    ubicacionFalsa = async () => ({ latitude: -33.4489, longitude: -70.6693, accuracy: 8 });
    component.foto.set('blob:foto');
    await component.adjuntarUbicacion();
    // Sin detectChanges(): la pantalla debe actualizarse sola gracias a los signals.
    await fixture.whenStable();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.photo-caption a');
    expect(link.href).toBe('https://www.google.com/maps/search/?api=1&query=-33.4489,-70.6693');
    expect(link.textContent).toContain('-33.44890, -70.66930');
    expect(fixture.nativeElement.querySelector('.photo-caption').textContent).toContain('± 8 m');
  });

  it('ignores a late location from a previous photo', async () => {
    let resolverPrimera!: (u: Ubicacion) => void;
    ubicacionFalsa = () => new Promise(resolve => (resolverPrimera = resolve));
    const primera = component.adjuntarUbicacion();
    ubicacionFalsa = async () => ({ latitude: 2, longitude: 2, accuracy: 5 });
    await component.adjuntarUbicacion(); // segunda foto
    resolverPrimera({ latitude: 1, longitude: 1, accuracy: 5 });
    await primera;
    expect(component.ubicacion()).toEqual({ latitude: 2, longitude: 2, accuracy: 5 });
    expect(component.buscandoUbicacion()).toBe(false);
  });

  it('shows a message when the photo location cannot be obtained', async () => {
    ubicacionFalsa = async () => { throw new Error('sin GPS'); };
    await component.adjuntarUbicacion();
    expect(component.ubicacion()).toBeNull();
    expect(component.mensajeDispositivo()).toContain('No se pudo obtener la ubicación');
  });

  it('shows the photo and the caption update without another click', async () => {
    let resolver!: (u: Ubicacion) => void;
    ubicacionFalsa = () => new Promise(resolve => (resolver = resolve));
    component.foto.set('blob:foto');
    const pendiente = component.adjuntarUbicacion();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.device-photo')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Obteniendo ubicación');

    resolver({ latitude: 1, longitude: 2, accuracy: 5 });
    await pendiente;
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('Obteniendo ubicación');
    expect(fixture.nativeElement.querySelector('.photo-caption a')).not.toBeNull();
  });

  it('formats the accuracy in meters or kilometers (Chilean format)', () => {
    expect(formatearPrecision(8.4)).toBe('± 8 m');
    expect(formatearPrecision(999)).toBe('± 999 m');
    expect(formatearPrecision(2500)).toBe('± 2,5 km');
    expect(formatearPrecision(1277201)).toBe('± 1.277 km');
  });

  it('marks a very imprecise location as approximate', async () => {
    ubicacionFalsa = async () => ({ latitude: -33.45285, longitude: -70.6347, accuracy: 1277201 });
    component.foto.set('blob:foto');
    await component.adjuntarUbicacion();
    await fixture.whenStable();
    const caption = fixture.nativeElement.querySelector('.photo-caption').textContent;
    expect(caption).toContain('± 1.277 km');
    expect(caption).toContain('(aproximada)');
  });

  it('does not mark a precise location as approximate', async () => {
    ubicacionFalsa = async () => ({ latitude: 1, longitude: 1, accuracy: 12 });
    component.foto.set('blob:foto');
    await component.adjuntarUbicacion();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.photo-caption').textContent).not.toContain('(aproximada)');
  });
});
