# Resumen del proyecto: App de Tareas (Ionic + Angular)

## 1. ¿Qué hace la app?

Es una **lista de tareas** con gestión de usuarios y acceso a funciones del celular:

- Escribes un **título** y una **descripción**.
- Presionas **"Agregar"** y la tarea aparece en la lista.
- Cada tarea tiene un **lápiz** para editarla y un **ícono de basura** para borrarla. Antes de borrarla, la app te pregunta si estás seguro.
- Si no hay tareas, aparece el mensaje **"No hay tareas todavía"**.
- Puedes **tomar una foto** con la cámara; la app le adjunta las **coordenadas GPS** de donde se tomó, como pie de foto con link a Google Maps.
- En la pantalla **Usuarios** puedes agregar y borrar usuarios (ver sección 13).
- Las tareas y usuarios se guardan en el **`localStorage`** del navegador, así que **no se pierden al recargar** (ver sección 14).

---

## 2. Tecnologías usadas

| Tecnología | Para qué sirve |
|---|---|
| **Angular** | El framework con el que se programa la app (TypeScript + HTML). |
| **Ionic** | Da los componentes visuales con aspecto de app móvil (`ion-button`, `ion-list`, etc.). |
| **Capacitor** | Convierte la app web en una app de Android o iOS. |
| **@ionic/pwa-elements** | Visor de cámara para cuando la app corre en el navegador. |
| **Sass (SCSS)** | Es CSS con extras (variables, funciones, mixins). |
| **Vitest** | Corre los tests (pruebas automáticas). |

---

## 3. Carpetas importantes

```
src/
├── main.ts              → Aquí arranca la app
├── global.scss          → Estilos para toda la app
├── theme/variables.scss → Colores de la app
└── app/
    ├── app.component.*  → Componente raíz (el "contenedor" de todo)
    ├── app.routes.ts    → Rutas (qué página se ve en cada URL)
    ├── home/            → La página principal (la de las tareas)
    ├── users/           → La página de usuarios
    ├── models/task.ts   → Cómo es una tarea (su forma)
    ├── models/user.ts   → Cómo es un usuario (su forma)
    ├── services/task.service.ts → Dónde se guardan y manejan las tareas
    ├── services/location.service.ts → Obtiene la ubicación GPS más precisa
    └── services/user.service.ts → Dónde se guardan y manejan los usuarios
src/assets/cyberpunk.jpg → Imagen de fondo de la app
android/                 → Proyecto nativo de Android (generado por Capacitor)
```

**Fácil de recordar:**
- **Model** = la **forma** de los datos.
- **Service** = la **lógica** y los datos.
- **Page** = lo que el usuario **ve**.

---

## 4. El modelo: `models/task.ts`

```ts
export interface Task {
  id: number;
  title: string;
  description: string;
}
```

Una **interface** dice cómo debe ser un objeto. Aquí, toda tarea tiene:
- `id` → un número único para identificarla.
- `title` → el título.
- `description` → la descripción.

---

## 5. El servicio: `services/task.service.ts`

El servicio **guarda las tareas** en un **`signal`** y tiene 4 funciones:

| Método | Qué hace |
|---|---|
| `getAll()` | Devuelve todas las tareas. |
| `add(title, description)` | Crea una tarea nueva y la agrega. Su `id` sale de un contador que parte en `Date.now()` y suma 1 cada vez, así nunca se repite. |
| `remove(id)` | Borra la tarea con ese id (usa `filter`). |
| `update(task)` | Reemplaza una tarea por su versión nueva (usa `map`). Se usa al **editar** una tarea. |

### ¿Por qué un `signal`?

Un `signal` es una "caja" con un valor que **avisa a Angular cuando cambia**, para que
la pantalla se actualice sola. Se lee con `tasks()` y se cambia con `tasks.update(...)`.

Esta app funciona **sin `zone.js`** (lo normal en las versiones nuevas de Angular), así que Angular solo redibuja
cuando algo le avisa. Si los datos estuvieran en un arreglo normal, al borrar desde
una alerta de Ionic la pantalla no se actualizaría hasta el siguiente clic.
Por eso `UserService` también usa `signal`.

`@Injectable({ providedIn: 'root' })` significa que hay **un solo servicio para toda la app**, y cualquier página puede usarlo.

### Persistencia con `localStorage`

Al crearse, el servicio lee las tareas guardadas con `loadFromStorage('tasks')`.
Además, en el constructor tiene un **`effect`**:

```ts
effect(() => saveToStorage(STORAGE_KEY, this.tasks()));
```

Un `effect` se ejecuta de nuevo **cada vez que cambia un signal que lee**. Como lee
`this.tasks()`, cada vez que se agrega, edita o borra una tarea, la lista se guarda sola
en `localStorage`. Así, `add`, `remove` y `update` no tuvieron que cambiar.

> ℹ️ `localStorage` guarda los datos **solo en ese navegador/dispositivo**. No es una base de datos (ver sección 14).

---

## 6. La página: `home/`

Tiene 3 archivos:

- **`home.page.html`** → lo que se ve (la plantilla).
- **`home.page.ts`** → la lógica (TypeScript).
- **`home.page.scss`** → los estilos de esta página.

### Lógica (`home.page.ts`)

```ts
private taskService = inject(TaskService);       // usa el servicio
private alertController = inject(AlertController); // para mostrar alertas

title = '';        // lo que se escribe en "Título"
description = '';  // lo que se escribe en "Descripción"
editingTaskId: number | null = null; // id de la tarea que se está editando (null = ninguna)
```

- **`inject()`** → trae el servicio a la página (esto se llama *inyección de dependencias*).
- **`get tasks()`** → le pide las tareas al servicio para mostrarlas.
- **`errorTarea`** → devuelve el mensaje de error del formulario (o `''` si está bien). Valida que el
  título no sea solo espacios, que tenga máximo **60** caracteres y que la descripción tenga máximo **200**.
  El mensaje se muestra en rojo con `ion-note`, y los inputs tienen contador de caracteres (`counter`).
- **`puedeGuardar`** → `true` solo si hay título y no hay errores; controla si el botón está activo.
- **`addTask()`**:
  1. Si `puedeGuardar` es `false`, no hace nada.
  2. Si no, agrega la tarea con `trim()` (borra los espacios del principio y del final).
  3. Si se está editando (`editingTaskId` no es `null`), usa `update()` en vez de `add()`.
  4. Limpia los campos.
- **`editTask(task)`** → copia la tarea al formulario y el botón cambia a "Guardar cambios".
- **`cancelEdit()`** → sale del modo edición y limpia los campos.
- **`deleteTask(id)`** → muestra una alerta con "Cancelar" y "Borrar". Solo si presionas "Borrar", la tarea se elimina.
- **`addIcons({ ... })`** → registra los íconos que usa la página (basura, lápiz, cámara, ubicación).

### Foto con ubicación (Capacitor)

No hay un botón aparte de ubicación: **la ubicación va adjunta a la foto**.

- **`tomarFoto()`** → usa `Camera.getPhoto()` del plugin `@capacitor/camera` con
  `source: CameraSource.Camera` y `webUseInput: false`, así **siempre abre la cámara** (no la galería):
  - en **Android** abre la app de cámara (cámara trasera);
  - en el **navegador** abre la webcam con el visor de `@ionic/pwa-elements`, que se activa en
    `src/main.ts` con `defineCustomElements(window)`. Si el equipo no tiene cámara, Capacitor ofrece elegir un archivo.

  Cuando hay foto, llama a `adjuntarUbicacion()`.
- **`adjuntarUbicacion()`** → le pide la ubicación a `services/location.service.ts` y la guarda
  junto a la foto. Si se toma otra foto antes de que llegue la ubicación de la anterior, esa
  ubicación vieja se descarta (contador `fotoActual`).
- **Pie de foto** (`<figure>` + `<figcaption>`): muestra "Obteniendo ubicación…" mientras busca, y luego
  las **coordenadas** como link **clickeable a Google Maps** (`linkMapa`) más la **precisión (± metros)**.
  En Android, el link abre la app de Google Maps si está instalada.
- **`foto`, `ubicacion`, `buscandoUbicacion`, `mensajeDispositivo` y `linkMapa` son `signal`/`computed`.**
  La app funciona sin `zone.js`, así que si fueran variables normales, la foto y la ubicación
  (que llegan después de un `await`) no aparecerían hasta el siguiente clic o cambio de pestaña.
  En la plantilla se leen como función: `foto()`, `ubicacion()`, etc.
- **Precisión legible:** `formatearPrecision()` muestra el error en formato chileno (`Intl.NumberFormat('es-CL')`):
  `± 8 m` si es menor a 1 km, o `± 2,5 km` / `± 1.277 km` si es mayor. Si el error supera **1 km**
  (`UMBRAL_APROXIMADA`), el pie de foto agrega **"(aproximada)"**. Esto pasa, por ejemplo, en un PC sin GPS,
  donde el navegador ubica por la IP y solo sabe el país o la ciudad.
- La foto y su pie se muestran **centrados** en la tarjeta (`.photo-figure` con `flex` + `align-items: center`).
- Ambas usan `try/catch`: si falla la cámara o la ubicación (sin permisos, GPS apagado), se muestra un mensaje.
- Los permisos de ubicación están en `android/app/src/main/AndroidManifest.xml`.

#### ¿Por qué la ubicación a veces queda "cerca pero lejos"?

Antes se usaba `getCurrentPosition()`, que devuelve **la primera lectura** que tenga el
celular. Esa lectura casi siempre viene de **Wi-Fi o de las antenas** (cientos de metros de
error), porque el GPS tarda unos segundos en "enganchar" satélites.

Ahora `LocationService.obtenerMejorUbicacion()` usa **`watchPosition()`**: escucha varias
lecturas seguidas y **se queda con la de menor error** (`coords.accuracy`). Se detiene apenas
logra **20 m o menos**, o a los **15 segundos** como máximo, y apaga el seguimiento con
`clearWatch()` para no gastar batería. Se usa `maximumAge: 0` para no recibir una posición vieja guardada.

- Los errores de **tiempo agotado** o **posición no disponible** no cortan la búsqueda (en un PC sin
  GPS son normales al pedir alta precisión). Solo **permiso denegado** la corta de inmediato.
- Si en esos 15 segundos no llegó ninguna lectura, se hace un **intento de respaldo** con
  `getCurrentPosition()` en baja precisión (Wi-Fi / IP), para que la foto igual tenga coordenadas.

Además la app avisa cuando:
- la precisión es peor que **100 m** (GPS apagado, bajo techo, etc.),
- en Android 12+ el usuario dio solo permiso de **ubicación aproximada** (≈1–3 km de error).

> ℹ️ En el **navegador de un PC** no hay GPS: la ubicación sale del Wi-Fi o de la IP, así que
> puede tener cientos de metros de error. Para probar la precisión real hay que usar el **celular**.

El plugin se inyecta con el token `GEOLOCATION`, así los tests pueden usar un GPS falso.

### Vista (`home.page.html`)

- **`[(ngModel)]="title"`** → *two-way binding*: lo que escribes en el input se guarda en la variable `title`, y si la variable cambia, el input también cambia.
- **`(click)="addTask()"`** → cuando haces clic, se llama a esa función.
- **`@for (task of tasks; track task.id)`** → repite el bloque una vez por cada tarea. `track` le dice a Angular cómo distinguir cada tarea.
- **`@empty`** → lo que se muestra si la lista está vacía.
- **`{{ task.title }}`** → muestra el valor de la variable en pantalla (*interpolación*).

---

## 7. Rutas: `app.routes.ts`

```ts
{ path: 'users', loadComponent: () => import('./users/users.page')... },
{ path: 'home', loadComponent: () => import('./home/home.page')... },
{ path: '', redirectTo: 'home', pathMatch: 'full' },
```

- Si entras a `/home`, se muestra la página Home.
- Si entras a `/users`, se muestra la página de usuarios.
- Si entras a `/` (sin nada), te **redirige** a `/home`.
- `loadComponent` = la página se carga **solo cuando se necesita** (*lazy loading*).

---

## 8. Colores y tema

- **Fondo:** las páginas usan `<ion-content class="city-bg">`, que pone la imagen
  `src/assets/cyberpunk.jpg` con una capa oscura encima para que el texto se lea bien.
- **Tarjetas "de vidrio":** las clases `.glass-card` (formularios) y `.glass-item` (cada
  tarea o usuario) usan fondo semitransparente + `backdrop-filter: blur(...)`.
  Están en `global.scss` para reutilizarlas en todas las páginas.
- **Avatar de usuario:** `<ion-avatar>` es el componente redondo de Ionic para fotos de
  perfil. Muestra las iniciales del nombre (método `initials()` en `users.page.ts`);
  para poner una foto real basta con un `<img>` dentro del `ion-avatar`.

- **`global.scss`** importa los estilos base de Ionic y activa el **modo oscuro siempre** (`dark.always.css`).
- **`theme/variables.scss`** define los colores propios:
  - `primary` → cian neón
  - `secondary` → magenta neón
  - `tertiary` → índigo
  - `danger` → rojo
  - También el fondo, la barra superior y los ítems.
- Usa un **mixin** (`ion-color`), que es como una "función" de Sass para no repetir código: genera todas las variantes de un color (normal, más oscuro, más claro, etc.).

---

## 9. Tests

| Archivo | Qué comprueba |
|---|---|
| `services/location.service.spec.ts` | Con un GPS falso: que se queda con la lectura más precisa, que se detiene al llegar a 20 m, que si se acaba el tiempo devuelve la mejor lectura, y que ignora errores de "tiempo agotado", que usa el respaldo de baja precisión si no llega ninguna lectura, y que corta de inmediato si se niega el permiso. |
| `services/task.service.spec.ts` | Que el servicio se crea, que se puede agregar y borrar una tarea, y que las tareas siguen ahí después de "recargar" (se crea un servicio nuevo y lee el `localStorage`). |
| `home/home.page.spec.ts` | Editar una tarea sin duplicarla, cancelar la edición, que la tarea desaparece de pantalla apenas se confirma el borrado, que borrar la tarea en edición limpia el formulario, que se rechazan títulos de solo espacios y textos demasiado largos, que la ubicación de la foto aparece como pie de foto con link a Google Maps, que la foto y el pie se actualizan en pantalla sin otro clic (signals), que se descarta la ubicación tardía de una foto anterior, y que se avisa si no se pudo obtener la ubicación. |
| `users/users.page.spec.ts` | Agregar un usuario (con `trim()`), rechazar nombres muy cortos, correos sin dominio (`ana@correo`) y correos repetidos, que el usuario solo se borra al confirmar y desaparece de pantalla al instante, y las iniciales del avatar. |

En los tests, el `AlertController` se reemplaza por uno falso (*mock*) para poder
"presionar" el botón **Borrar** desde el código. Además, `src/test-setup.ts` limpia el
`localStorage` antes de cada test para que los datos de uno no aparezcan en otro.

---

## 10. Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm install` | Instala las dependencias. |
| `npm start` | Abre la app en el navegador (`http://localhost:4200`). |
| `npm test` | Corre los tests. |
| `npm run build` | Compila la app (el resultado queda en `www/`). |
| `npx cap sync android` | Copia el build (`www/`) y los plugins al proyecto Android. Correrlo después de cada `npm run build`. |
| `npx cap open android` | Abre el proyecto en Android Studio para instalar la app en el celular. |

> No hace falta la CLI global de Ionic (`ionic ...`): `npm start` y `npm run build` hacen lo mismo
> que `ionic serve` e `ionic build`. Si se quiere, se instala con `npm install -g @ionic/cli`.

---

## 11. Posibles preguntas de evaluación

- **¿Qué es un servicio?** → Una clase que guarda datos o lógica para compartirlos entre páginas.
- **¿Qué es una interface?** → Define la forma que debe tener un objeto.
- **¿Qué hace `[(ngModel)]`?** → Conecta un input con una variable en ambos sentidos.
- **¿Para qué es `track` en `@for`?** → Para que Angular identifique cada elemento y actualice la lista de forma eficiente.
- **¿Qué es lazy loading?** → Cargar una página solo cuando el usuario entra a ella.
- **¿Por qué no se pierden las tareas al recargar?** → Porque se guardan en `localStorage` mediante un `effect`, y el servicio las vuelve a leer al iniciar.
- **¿Qué es un `effect`?** → Una función que se ejecuta de nuevo cada vez que cambia un `signal` que usa. Aquí se usa para guardar automáticamente.
- **¿`localStorage` es una base de datos?** → No. Guarda texto (JSON) solo en ese navegador; no se comparte entre dispositivos ni usuarios.
- **¿Qué es un `signal`?** → Un valor reactivo: cuando cambia, Angular actualiza la pantalla automáticamente.
- **¿Qué diferencia hay entre `ngModel` y formularios reactivos?** → `ngModel` (tareas) es más simple y se define en el HTML; los formularios reactivos (usuarios) se definen en el TypeScript con `FormBuilder` y permiten validaciones como `Validators.required` o `Validators.email`.
- **¿Qué es `ion-avatar`?** → El componente circular de Ionic para fotos de perfil.
- **¿Por qué `watchPosition` y no `getCurrentPosition`?** → Porque la primera lectura suele ser imprecisa (Wi-Fi/antenas); escuchando varias se puede elegir la de menor error.
- **¿Qué es `coords.accuracy`?** → El radio de error en metros: la posición real está dentro de ese círculo. Ej: `± 1.277 km` significa que el navegador solo sabe que estás en Chile (ubicación por IP).
- **¿Cómo se valida un correo repetido?** → Con un **validador propio** (`emailNoRepetido`) que le pregunta al `UserService` si el correo ya existe y devuelve el error `duplicado`.
- **¿Por qué la foto usa `signal`?** → Porque sin `zone.js` Angular no detecta cambios hechos después de un `await`; el `signal` le avisa que debe redibujar.
- **¿Para qué sirve `@ionic/pwa-elements`?** → Da el visor de cámara para el navegador; sin él, Capacitor en web solo puede abrir el selector de archivos.
- **¿Qué es Capacitor?** → La herramienta que convierte la app web en app nativa y da acceso a la cámara, GPS, etc. mediante plugins.

---

## 12. Cosas que se podrían mejorar

1. **Integrar una base de datos real** (ver sección 14).
2. Cambiar el `appId` (`io.ionic.starter`) por uno propio.
3. Usar la foto tomada con la cámara como foto de perfil en el `ion-avatar` del usuario.
4. Asignar tareas a usuarios.

## 13. Gestión de usuarios

Desde el botón **Usuarios** de la pantalla de tareas se accede a `/users`.
Esta pantalla permite agregar usuarios con nombre y correo, consultar la lista
con su cantidad y eliminar usuarios (antes de borrar, la app pide confirmación,
igual que con las tareas). El nombre requiere al menos dos caracteres
sin contar espacios al inicio y al final, y el correo debe tener un formato válido.

**Validaciones del formulario de usuarios:**

| Campo | Regla | Validador |
|---|---|---|
| Nombre | Obligatorio | `Validators.required` |
| Nombre | Entre 2 y 50 caracteres (después del `trim()`) | `Validators.minLength(2)`, `Validators.maxLength(50)` |
| Correo | Obligatorio | `Validators.required` |
| Correo | Formato válido **con dominio** (`ana@correo.cl` sí, `ana@correo` no) | `Validators.email` + `Validators.pattern(...)` |
| Correo | Máximo 100 caracteres | `Validators.maxLength(100)` |
| Correo | No repetido (sin importar mayúsculas) | Validador propio `emailNoRepetido`, que usa `UserService.existsEmail()` |

Cada error muestra su propio mensaje en rojo debajo del campo.
El botón **Mis tareas** permite regresar a `/home`.

Cada usuario se muestra con un **avatar redondo** (`ion-avatar`) con sus iniciales.

La página está en `src/app/users/` y utiliza formularios reactivos.
`src/app/services/user.service.ts` administra los usuarios (en un `signal`, igual que las tareas) usando el modelo
`User` de `src/app/models/user.ts`. Los datos se guardan en `localStorage` (clave `users`), así que se conservan
al navegar entre pantallas y al recargar la aplicación. El `id` del siguiente usuario
continúa desde el mayor id guardado, para que no se repitan después de recargar.
Esta funcionalidad administra una lista de usuarios; no implementa autenticación
ni asignación de tareas a usuarios.

---

## 14. Persistencia de datos y base de datos pendiente

**Lo que hay:** las tareas (clave `tasks`) y los usuarios (clave `users`) se guardan en
el `localStorage` del navegador como JSON. Las funciones `loadFromStorage` y `saveToStorage`
están en `services/task.service.ts` y las usan ambos servicios. Si `localStorage` no está
disponible o el JSON está dañado, la app parte con la lista vacía y sigue funcionando en memoria.

**Lo que falta:** la evaluación pedía integrar una **base de datos**, y eso **no quedó
implementado**. Con `localStorage`, los datos:

- viven solo en ese navegador o dispositivo,
- no se comparten entre usuarios ni equipos,
- se borran si se limpian los datos del navegador o de la app.

**Cómo se integraría:** como toda la lógica de datos está en los servicios, solo habría
que cambiar `TaskService` y `UserService` para que lean y escriban en la base de datos
(por ejemplo SQLite con `@capacitor-community/sqlite` en el celular, o un backend/Firebase
vía `HttpClient`), sin tocar las páginas. Los `signal` seguirían actualizando la pantalla igual.
