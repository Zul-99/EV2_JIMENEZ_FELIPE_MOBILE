# Resumen del proyecto: App de Tareas (Ionic + Angular)

## 1. ¿Qué hace la app?

Es una **lista de tareas** con gestión de usuarios y acceso a funciones del celular:

- Escribes un **título** y una **descripción**.
- Presionas **"Agregar"** y la tarea aparece en la lista.
- Cada tarea tiene un **lápiz** para editarla y un **ícono de basura** para borrarla. Antes de borrarla, la app te pregunta si estás seguro.
- Si no hay tareas, aparece el mensaje **"No hay tareas todavía"**.
- Puedes **tomar una foto** con la cámara y **obtener tu ubicación** (GPS).
- En la pantalla **Usuarios** puedes agregar y borrar usuarios (ver sección 13).

---

## 2. Tecnologías usadas

| Tecnología | Para qué sirve |
|---|---|
| **Angular** | El framework con el que se programa la app (TypeScript + HTML). |
| **Ionic** | Da los componentes visuales con aspecto de app móvil (`ion-button`, `ion-list`, etc.). |
| **Capacitor** | Convierte la app web en una app de Android o iOS. |
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

> ⚠️ Las tareas se guardan **en memoria**: si recargas la app, se pierden.

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
- **`addTask()`**:
  1. Si el título está vacío, no hace nada.
  2. Si no, agrega la tarea con `trim()` (borra los espacios del principio y del final).
  3. Si se está editando (`editingTaskId` no es `null`), usa `update()` en vez de `add()`.
  4. Limpia los campos.
- **`editTask(task)`** → copia la tarea al formulario y el botón cambia a "Guardar cambios".
- **`cancelEdit()`** → sale del modo edición y limpia los campos.
- **`deleteTask(id)`** → muestra una alerta con "Cancelar" y "Borrar". Solo si presionas "Borrar", la tarea se elimina.
- **`addIcons({ ... })`** → registra los íconos que usa la página (basura, lápiz, cámara, ubicación).

### Cámara y ubicación (Capacitor)

- **`tomarFoto()`** → usa `Camera.getPhoto()` del plugin `@capacitor/camera`. En el navegador
  abre un selector de archivo; en Android abre la cámara. La foto se muestra en pantalla.
- **`obtenerUbicacion()`** → usa `Geolocation.getCurrentPosition()` del plugin
  `@capacitor/geolocation` y muestra la latitud y longitud.
- Ambas usan `try/catch`: si algo falla (sin permisos, GPS apagado), se muestra un mensaje.
- Los permisos de ubicación están en `android/app/src/main/AndroidManifest.xml`.

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
| `services/task.service.spec.ts` | Que el servicio se crea y que se puede agregar y borrar una tarea. |
| `home/home.page.spec.ts` | Editar una tarea sin duplicarla, cancelar la edición, que la tarea desaparece de pantalla apenas se confirma el borrado, y que borrar la tarea en edición limpia el formulario. |
| `users/users.page.spec.ts` | Agregar un usuario (con `trim()`), rechazar nombres muy cortos, que el usuario solo se borra al confirmar y desaparece de pantalla al instante, y las iniciales del avatar. |

En los tests, el `AlertController` se reemplaza por uno falso (*mock*) para poder
"presionar" el botón **Borrar** desde el código.

---

## 10. Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm install` | Instala las dependencias. |
| `ionic serve` o `npm start` | Abre la app en el navegador. |
| `npm test` | Corre los tests. |
| `npm run build` | Compila la app (el resultado queda en `www/`). |

---

## 11. Posibles preguntas de evaluación

- **¿Qué es un servicio?** → Una clase que guarda datos o lógica para compartirlos entre páginas.
- **¿Qué es una interface?** → Define la forma que debe tener un objeto.
- **¿Qué hace `[(ngModel)]`?** → Conecta un input con una variable en ambos sentidos.
- **¿Para qué es `track` en `@for`?** → Para que Angular identifique cada elemento y actualice la lista de forma eficiente.
- **¿Qué es lazy loading?** → Cargar una página solo cuando el usuario entra a ella.
- **¿Por qué se pierden las tareas al recargar?** → Porque se guardan en memoria, no en un almacenamiento permanente.
- **¿Qué es un `signal`?** → Un valor reactivo: cuando cambia, Angular actualiza la pantalla automáticamente.
- **¿Qué diferencia hay entre `ngModel` y formularios reactivos?** → `ngModel` (tareas) es más simple y se define en el HTML; los formularios reactivos (usuarios) se definen en el TypeScript con `FormBuilder` y permiten validaciones como `Validators.required` o `Validators.email`.
- **¿Qué es `ion-avatar`?** → El componente circular de Ionic para fotos de perfil.
- **¿Qué es Capacitor?** → La herramienta que convierte la app web en app nativa y da acceso a la cámara, GPS, etc. mediante plugins.

---

## 12. Cosas que se podrían mejorar

1. **Guardar las tareas y usuarios** con `localStorage` o `@capacitor/preferences` para que no se pierdan.
2. Cambiar el `appId` (`io.ionic.starter`) por uno propio.
3. Usar la foto tomada con la cámara como foto de perfil en el `ion-avatar` del usuario.
4. Asignar tareas a usuarios.

## 13. Gestión de usuarios

Desde el botón **Usuarios** de la pantalla de tareas se accede a `/users`.
Esta pantalla permite agregar usuarios con nombre y correo, consultar la lista
con su cantidad y eliminar usuarios (antes de borrar, la app pide confirmación,
igual que con las tareas). El nombre requiere al menos dos caracteres
sin contar espacios al inicio y al final, y el correo debe tener un formato válido.
El botón **Mis tareas** permite regresar a `/home`.

Cada usuario se muestra con un **avatar redondo** (`ion-avatar`) con sus iniciales.

La página está en `src/app/users/` y utiliza formularios reactivos.
`src/app/services/user.service.ts` administra los usuarios (en un `signal`, igual que las tareas) usando el modelo
`User` de `src/app/models/user.ts`. Los datos se conservan al navegar entre pantallas,
pero se pierden al recargar la aplicación porque se almacenan en memoria.
Esta funcionalidad administra una lista de usuarios; no implementa autenticación
ni asignación de tareas a usuarios.
