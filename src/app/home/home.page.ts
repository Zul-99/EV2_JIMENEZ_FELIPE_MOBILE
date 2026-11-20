import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { addIcons} from 'ionicons';
import { trash, createOutline, cameraOutline, locationOutline } from 'ionicons/icons';
import { Task } from '../models/task';
import {Camera, CameraResultType, CameraSource} from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { TaskService } from '../services/task.service';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonList, 
IonItem, IonLabel, IonButton, IonButtons, IonInput, IonIcon, AlertController
 } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, 
    IonContent, IonList, IonItem, IonLabel, 
    IonButton, IonButtons, IonInput, IonIcon, FormsModule, RouterLink],
})
export class HomePage {
  
  private taskService = inject(TaskService);
  private alertController = inject(AlertController);

  title = '';
  description = '';
  editingTaskId: number | null = null;

  constructor() {
    addIcons({ trash, createOutline, cameraOutline, locationOutline });
  }

  get tasks() {
    return this.taskService.getAll();
  }

  addTask() {
    if (!this.title.trim()) return;
    if (this.editingTaskId === null) {
      this.taskService.add(this.title.trim(), this.description.trim());
    } else {
      this.taskService.update({
        id: this.editingTaskId,
        title: this.title.trim(),
        description: this.description.trim(),
      });
    }
    this.cancelEdit();
  }

  editTask(task: Task): void {
    this.editingTaskId = task.id;
    this.title = task.title;
    this.description = task.description;
  }

  cancelEdit(): void {
    this.editingTaskId = null;
    this.title = '';
    this.description = '';
  }

  async deleteTask(id: number) {
    const alert = await this.alertController.create({
      header: 'Borrar tarea',
      message: '¿Estás seguro que deseas borrar la tarea?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Borrar',
          role: 'destructive',
          handler: () => {
            this.taskService.remove(id);
            if (this.editingTaskId === id) this.cancelEdit();
          },
        },
      ],
    });
    await alert.present();
  }

  //Funcion para fotos y geolocalizacion

  foto: string | undefined;
  ubicacion: { latitude: number; longitude: number } | null = null;
  mensajeDispositivo = "";
  
  async tomarFoto(): Promise<void> {
    this.mensajeDispositivo = "";

    try {
      const image = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        webUseInput: true
      });
     
     this.foto = image.webPath;
    } catch {
      this.mensajeDispositivo = "Error al tomar foto, por favor intentalo nuevamente.";
    }
  }

  async obtenerUbicacion(): Promise<void> {
    this.mensajeDispositivo = '';

    try {
      const posicion = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      this.ubicacion = {
        latitude: posicion.coords.latitude,
        longitude: posicion.coords.longitude,
      };
    } catch {
      this.mensajeDispositivo =
        'No se pudo obtener la ubicación. Revisa los permisos y el GPS.';
    }
  }
}