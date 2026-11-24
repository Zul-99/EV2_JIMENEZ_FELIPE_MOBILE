import { TestBed } from '@angular/core/testing';
import { Position } from '@capacitor/geolocation';
import { GEOLOCATION, GeolocationApi, LocationService } from './location.service';

function posicion(latitude: number, longitude: number, accuracy: number): Position {
  return { timestamp: Date.now(), coords: { latitude, longitude, accuracy } } as Position;
}

describe('LocationService', () => {
  let service: LocationService;
  let enviar: (pos: Position | null, err?: unknown) => void;
  let getCurrentPosition: ReturnType<typeof vi.fn<() => Promise<Position>>>;
  let clearWatch: ReturnType<typeof vi.fn<(opts: { id: string }) => Promise<void>>>;

  beforeEach(() => {
    clearWatch = vi.fn(async (_opts: { id: string }) => undefined);
    getCurrentPosition = vi.fn(async () => posicion(9, 9, 1500));
    // GPS falso: guarda el callback para "enviar" lecturas desde el test.
    const fakeGeolocation = {
      watchPosition: async (_opts: unknown, callback: typeof enviar) => {
        enviar = callback;
        return 'watch-1';
      },
      clearWatch,
      getCurrentPosition,
    } as unknown as GeolocationApi;
    TestBed.configureTestingModule({ providers: [{ provide: GEOLOCATION, useValue: fakeGeolocation }] });
    service = TestBed.inject(LocationService);
  });

  it('keeps the most accurate reading and stops when it is good enough', async () => {
    const resultado = service.obtenerMejorUbicacion(20, 5000);
    await Promise.resolve();
    enviar(posicion(-33.40, -70.60, 900)); // primera lectura: Wi-Fi/antenas
    enviar(posicion(-33.41, -70.61, 60));
    enviar(posicion(-33.42, -70.62, 12)); // GPS enganchado: se detiene aquí
    expect(await resultado).toEqual({ latitude: -33.42, longitude: -70.62, accuracy: 12 });
    expect(clearWatch).toHaveBeenCalledWith({ id: 'watch-1' });
  });

  it('returns the best reading when time runs out', async () => {
    vi.useFakeTimers();
    try {
      const resultado = service.obtenerMejorUbicacion(20, 5000);
      await Promise.resolve();
      enviar(posicion(1, 1, 300));
      enviar(posicion(2, 2, 80));
      enviar(posicion(3, 3, 150)); // peor que la anterior: se ignora
      await vi.advanceTimersByTimeAsync(5000);
      expect(await resultado).toEqual({ latitude: 2, longitude: 2, accuracy: 80 });
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores timeout errors and keeps waiting for a reading', async () => {
    const resultado = service.obtenerMejorUbicacion(20, 5000);
    await Promise.resolve();
    enviar(null, { code: 3, message: 'Timeout expired' }); // normal en un PC sin GPS
    enviar(posicion(4, 4, 10));
    expect(await resultado).toEqual({ latitude: 4, longitude: 4, accuracy: 10 });
  });

  it('falls back to a low accuracy reading when no reading arrives', async () => {
    vi.useFakeTimers();
    try {
      const resultado = service.obtenerMejorUbicacion(20, 5000);
      await Promise.resolve();
      enviar(null, { code: 3, message: 'Timeout expired' });
      await vi.advanceTimersByTimeAsync(5000);
      expect(await resultado).toEqual({ latitude: 9, longitude: 9, accuracy: 1500 });
      expect(getCurrentPosition).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('fails right away when permission is denied', async () => {
    const resultado = service.obtenerMejorUbicacion(20, 5000);
    await Promise.resolve();
    enviar(null, { code: 1, message: 'User denied Geolocation' });
    await expect(resultado).rejects.toMatchObject({ code: 1 });
    expect(clearWatch).toHaveBeenCalled();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });
});
