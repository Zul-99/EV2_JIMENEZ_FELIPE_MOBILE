import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons} from 'ionicons';
import { trash, createOutline, cameraOutline, locationOutline } from 'ionicons/icons';
import { Task } from '../models/task';
import { Camera, CameraDirection, CameraResultType, CameraSource } from '@capacitor/camera';
import { TaskService } from '../services/task.service';
import { LocationService, Ubicacion } from '../services/location.service';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonList, 
IonItem, IonLabel, IonButton, IonButtons, IonInput, IonIcon, IonNote, AlertController
 } from '@ionic/angular';

/** Sobre este error (en metros) la ubicación se marca como "aproximada" en el pie de foto. */
export const UMBRAL_APROXIMADA = 1000;

/** Formato chileno: 1.277 (miles con punto) y 2,5 (decimales con coma). */
const formatoCL = (maxDecimales: number) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: maxDecimales });

/** "± 8 m", "± 2,5 km", "± 1.277 km". */
export function formatearPrecision(metros: number): string {
  if (metros < 1000) return `± ${formatoCL(0).format(metros)} m`;
  const km = metros / 1000;
  return `± ${formatoCL(km < 10 ? 1 : 0).format(km)} km`;
}

export const TITULO_MAX = 60;
export const DESCRIPCION_MAX = 200;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, 
    IonContent, IonList, IonItem, IonLabel, 
    IonButton, IonButtons, IonInput, IonIcon, IonNote, FormsModule, RouterLink, DecimalPipe],
})
export class HomePage {
  readonly tituloMax = TITULO_MAX;
  readonly descripcionMax = DESCRIPCION_MAX;

  private taskService = inject(TaskService);
  private locationService = inject(LocationService);
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

  /** Mensaje de error del formulario de tareas, o '' si es válido. */
  get errorTarea(): string {
    const title = this.title.trim();
    const description = this.description.trim();
    if (this.title && !title) return 'El título no puede ser solo espacios.';
    if (title.length > TITULO_MAX) return `El título admite máximo ${TITULO_MAX} caracteres.`;
    if (description.length > DESCRIPCION_MAX) return `La descripción admite máximo ${DESCRIPCION_MAX} caracteres.`;
    return '';
  }

  get puedeGuardar(): boolean {
    return !!this.title.trim() && !this.errorTarea;
  }

  addTask() {
    if (!this.puedeGuardar) return;
    const title = this.title.trim();
    const description = this.description.trim();
    if (this.editingTaskId === null) {
      this.taskService.add(title, description);
    } else {
      this.taskService.update({ id: this.editingTaskId, title, description });
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

  // Foto con ubicación: al tomar una foto se le adjuntan las coordenadas
  // de donde se tomó, que se muestran como pie de foto (link a Google Maps).
  //
  // Son `signal` porque la app funciona sin zone.js: un valor normal que cambia después
  // de un `await` (cámara, GPS) no redibuja la pantalla hasta el siguiente clic.

  readonly foto = signal<string | undefined>(undefined);
  readonly ubicacion = signal<Ubicacion | null>(null);
  readonly buscandoUbicacion = signal(false);
  readonly mensajeDispositivo = signal('');

  /** Link de Google Maps (en Android abre la app de Maps si está instalada). */
  readonly linkMapa = computed(() => {
    const u = this.ubicacion();
    return u ? `https://www.google.com/maps/search/?api=1&query=${u.latitude},${u.longitude}` : '';
  });

  /** Precisión legible: "± 8 m" o "± 1.277 km". */
  readonly precisionTexto = computed(() => {
    const u = this.ubicacion();
    return u ? formatearPrecision(u.accuracy) : '';
  });

  /** true si el error es tan grande que la ubicación es solo aproximada (ej: por IP en un PC). */
  readonly esAproximada = computed(() => (this.ubicacion()?.accuracy ?? 0) > UMBRAL_APROXIMADA);

  /** Cuenta las fotos tomadas, para ignorar la ubicación de una foto anterior si llega tarde. */
  private fotoActual = 0;

  async tomarFoto(): Promise<void> {
    this.mensajeDispositivo.set('');

    try {
      const image = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.Uri,
        // Siempre la cámara (no la galería). En el navegador abre la webcam con
        // @ionic/pwa-elements; si el equipo no tiene cámara, Capacitor ofrece elegir un archivo.
        source: CameraSource.Camera,
        direction: CameraDirection.Rear,
        webUseInput: false,
      });
      this.foto.set(image.webPath);
    } catch {
      this.mensajeDispositivo.set('Error al tomar foto, por favor intentalo nuevamente.');
      return;
    }

    await this.adjuntarUbicacion();
  }

  /** Busca la ubicación actual y la asocia a la foto recién tomada. */
  async adjuntarUbicacion(): Promise<void> {
    const foto = ++this.fotoActual;
    this.ubicacion.set(null);
    this.buscandoUbicacion.set(true);

    try {
      const ubicacion = await this.locationService.obtenerMejorUbicacion();
      if (foto !== this.fotoActual) return; // ya se tomó otra foto
      this.ubicacion.set(ubicacion);

      if (await this.locationService.soloUbicacionAproximada()) {
        this.mensajeDispositivo.set(
          'Solo diste permiso de ubicación aproximada. Actívala como "precisa" en los ajustes de la app.');
      } else if (ubicacion.accuracy > 100) {
        this.mensajeDispositivo.set(
          'Ubicación poco precisa. Activa el GPS, sal a un lugar abierto o toma la foto de nuevo.');
      }
    } catch {
      if (foto !== this.fotoActual) return;
      this.mensajeDispositivo.set(
        'No se pudo obtener la ubicación de la foto. Revisa los permisos y el GPS.');
    } finally {
      if (foto === this.fotoActual) this.buscandoUbicacion.set(false);
    }
  }
}