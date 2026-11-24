import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonAvatar, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput,
  IonItem, IonLabel, IonList, IonNote, IonTitle, IonToolbar, AlertController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { trash } from 'ionicons/icons';
import { UserService } from '../services/user.service';

export const NOMBRE_MAX = 50;
export const EMAIL_MAX = 100;
/** Exige algo@dominio.ext (Validators.email solo acepta también "a@b", sin dominio). */
const EMAIL_CON_DOMINIO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

@Component({
  selector: 'app-users',
  templateUrl: 'users.page.html',
  styleUrls: ['users.page.scss'],
  imports: [ReactiveFormsModule, RouterLink, IonAvatar, IonButton, IonButtons, IonContent,
    IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList,
    IonNote, IonTitle, IonToolbar],
})
export class UsersPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly alertController = inject(AlertController);

  readonly nombreMax = NOMBRE_MAX;
  readonly emailMax = EMAIL_MAX;

  /** Validador propio: marca error si el correo ya está registrado. */
  private readonly emailNoRepetido = (control: AbstractControl): ValidationErrors | null =>
    this.userService.existsEmail(control.value ?? '') ? { duplicado: true } : null;

  readonly userForm = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(NOMBRE_MAX)]],
    email: ['', [
      Validators.required,
      Validators.email,
      Validators.pattern(EMAIL_CON_DOMINIO),
      Validators.maxLength(EMAIL_MAX),
      this.emailNoRepetido,
    ]],
  });

  get users() {
    return this.userService.getAll();
  }

  constructor() {
    addIcons({ trash });
  }

  addUser(): void {
    const value = this.userForm.getRawValue();
    this.userForm.setValue({ nombre: value.nombre.trim(), email: value.email.trim() });
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }
    const { nombre, email } = this.userForm.getRawValue();
    this.userService.add(nombre, email);
    this.userForm.reset();
  }

  /** Iniciales para el avatar: "Ana Pérez" -> "AP", "Ana" -> "A". */
  initials(nombre: string): string {
    return nombre
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(parte => parte[0].toUpperCase())
      .join('');
  }

  async deleteUser(id: number): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Borrar usuario',
      message: '¿Estás seguro que deseas borrar este usuario?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Borrar',
          role: 'destructive',
          handler: () => this.userService.remove(id),
        },
      ],
    });
    await alert.present();
  }
}
