import { Injectable, InjectionToken, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation, GeolocationPlugin, Position } from '@capacitor/geolocation';

export interface Ubicacion {
  latitude: number;
  longitude: number;
  /** Radio de error en metros: la posición real está dentro de este círculo. */
  accuracy: number;
}

/** Precisión (en metros) con la que se deja de esperar: ya es "suficientemente buena". */
export const PRECISION_DESEADA = 20;
/** Tiempo máximo (ms) que se espera a que el GPS mejore su precisión. */
export const TIEMPO_MAXIMO = 15000;

/** true si el error es "permiso denegado" (código 1 en la API del navegador). */
function esPermisoDenegado(err: unknown): boolean {
  const e = err as { code?: unknown; message?: unknown } | null;
  return e?.code === 1 || /denied|denegad/i.test(String(e?.message ?? ''));
}

/** Funciones del plugin de geolocalización que usa la app. */
export type GeolocationApi = Pick<
  GeolocationPlugin, 'getCurrentPosition' | 'watchPosition' | 'clearWatch' | 'checkPermissions'
>;

/**
 * Plugin de geolocalización inyectable (en los tests se reemplaza por uno falso).
 * Se envuelve en un objeto normal porque el plugin de Capacitor es un proxy que
 * "responde" a cualquier método, y Angular confundiría eso con un `ngOnDestroy`.
 */
export const GEOLOCATION = new InjectionToken<GeolocationApi>('GEOLOCATION', {
  providedIn: 'root',
  factory: () => ({
    getCurrentPosition: options => Geolocation.getCurrentPosition(options),
    watchPosition: (options, callback) => Geolocation.watchPosition(options, callback),
    clearWatch: options => Geolocation.clearWatch(options),
    checkPermissions: () => Geolocation.checkPermissions(),
  }),
});

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly geolocation = inject(GEOLOCATION);
  /**
   * Obtiene la ubicación más precisa posible.
   *
   * `getCurrentPosition` entrega la PRIMERA lectura, que suele venir de Wi-Fi o de las
   * antenas (cientos de metros de error) porque el GPS todavía no "engancha" satélites.
   * Aquí se escuchan varias lecturas con `watchPosition` y se queda con la de menor error,
   * hasta llegar a PRECISION_DESEADA o hasta que pase TIEMPO_MAXIMO.
   *
   * Los errores de "tiempo agotado" o "posición no disponible" NO cortan la búsqueda (en un PC
   * sin GPS son normales al pedir alta precisión); solo "permiso denegado" la corta.
   * Si al final no llegó ninguna lectura, se intenta una vez con baja precisión (Wi-Fi/IP).
   */
  async obtenerMejorUbicacion(
    precisionDeseada = PRECISION_DESEADA,
    tiempoMaximo = TIEMPO_MAXIMO,
  ): Promise<Ubicacion> {
    // `as` evita que TypeScript asuma que sigue siendo null (se asigna dentro del callback).
    let mejor = null as Position | null;
    let error: unknown = null;
    let terminar!: () => void;
    const terminado = new Promise<void>(resolve => (terminar = resolve));

    const watchId = await this.geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: tiempoMaximo, maximumAge: 0 },
      (posicion, err) => {
        if (err || !posicion) {
          error = err;
          if (esPermisoDenegado(err)) terminar();
          return;
        }
        if (!mejor || posicion.coords.accuracy < mejor.coords.accuracy) {
          mejor = posicion;
        }
        if (posicion.coords.accuracy <= precisionDeseada) {
          terminar();
        }
      },
    );

    const timer = setTimeout(terminar, tiempoMaximo);
    await terminado;
    clearTimeout(timer);
    await this.geolocation.clearWatch({ id: watchId });

    if (!mejor) {
      if (esPermisoDenegado(error)) throw error;
      // Respaldo: ubicación aproximada (Wi-Fi / IP). Si esto también falla, se lanza el error.
      mejor = await this.geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      });
    }
    return {
      latitude: mejor.coords.latitude,
      longitude: mejor.coords.longitude,
      accuracy: mejor.coords.accuracy,
    };
  }

  /**
   * En Android 12+ el usuario puede dar solo "ubicación aproximada" (~1-3 km de error).
   * Devuelve true si la app NO tiene permiso de ubicación precisa en el celular.
   */
  async soloUbicacionAproximada(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const permisos = await this.geolocation.checkPermissions();
      return permisos.location !== 'granted' && permisos.coarseLocation === 'granted';
    } catch {
      return false;
    }
  }
}
