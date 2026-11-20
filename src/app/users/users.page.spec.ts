import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { UsersPage } from './users.page';
import { UserService } from '../services/user.service';

describe('UsersPage', () => {
  let component: UsersPage;
  let fixture: ComponentFixture<UsersPage>;
  let service: UserService;
  let confirmDelete: () => void;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersPage],
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
    fixture = TestBed.createComponent(UsersPage);
    component = fixture.componentInstance;
    service = TestBed.inject(UserService);
    fixture.detectChanges();
  });

  it('adds a valid user with trimmed values', () => {
    component.userForm.setValue({ nombre: '  Ana  ', email: ' ana@correo.cl ' });
    component.addUser();
    expect(service.getAll()).toEqual([{ id: 1, nombre: 'Ana', email: 'ana@correo.cl' }]);
  });

  it('rejects a name that is too short after trimming', () => {
    component.userForm.setValue({ nombre: ' A ', email: 'ana@correo.cl' });
    component.addUser();
    expect(service.getAll()).toHaveLength(0);
  });

  it('only deletes the user after confirming', async () => {
    service.add('Ana', 'ana@correo.cl');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('ana@correo.cl');
    await component.deleteUser(service.getAll()[0].id);
    expect(service.getAll()).toHaveLength(1);
    confirmDelete();
    await fixture.whenStable();
    expect(service.getAll()).toHaveLength(0);
    // La pantalla debe actualizarse sola, sin otro clic.
    expect(fixture.nativeElement.textContent).not.toContain('ana@correo.cl');
    expect(fixture.nativeElement.textContent).toContain('No hay usuarios todavía');
  });

  it('builds avatar initials from the name', () => {
    expect(component.initials('Ana Pérez Soto')).toBe('AP');
    expect(component.initials('felipe')).toBe('F');
  });
});
