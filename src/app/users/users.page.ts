import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonAvatar, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput,
  IonItem, IonLabel, IonList, IonNote, IonTitle, IonToolbar, AlertController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { trash } from 'ionicons/icons';
import { UserService } from '../services/user.service';

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

  readonly userForm = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
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
