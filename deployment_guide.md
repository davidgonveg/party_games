# Guía de Despliegue y Pruebas Móviles

Existen dos formas principales de probar la aplicación en tu móvil:
1.  **Red Local (WiFi):** La forma más rápida e inmediata. Tú y tus amigos debéis estar conectado al mismo WiFi.
2.  **Despliegue en la Nube (Render/Railway):** Para jugar desde cualquier lugar (4G/5G).

---

## Opción 1: Red Local (Inmediato)

Para probarlo **ya mismo** sin configurar servidores externos:

1.  Asegúrate de que tu PC y tu móvil están en el **mismo WiFi**.
2.  Abre una terminal en tu PC (en la carpeta `client`) y ejecuta:
    ```bash
    npm run dev -- --host
    ```
    *(El flag `--host` hace que Vite exponga la IP).*
3.  La terminal te mostrará algo como:
    ```
    ➜  Local:   http://localhost:5173/
    ➜  Network: http://192.168.1.XX:5173/  <-- USA ESTA
    ```
4.  **Importante:** Tienes que configurar el cliente para que se conecte a tu PC en lugar de `localhost`.
    *   Abre `client/src/contexts/SocketContext.jsx`.
    *   Cambia `SOCKET_URL` temporalmente a tu IP local (la devuelta arriba):
        ```javascript
        const SOCKET_URL = 'http://192.168.1.XX:3001'; // Pon tu IP real aquí
        ```
5.  Reinicia el servidor backend (`node start_server.js`) y el frontend.
6.  Desde el móvil, entra a `http://192.168.1.XX:5173`.

> **Nota:** Windows Firewall puede bloquear la conexión. Si no carga, permite el acceso a Node.js en el Firewall o desactívalo momentáneamente.

---

## Opción 2: Despliegue en la Nube (Gratis en Render.com)

Esta es la opción profesional para dejarlo publicado. Usaremos **Render** porque permite subir tanto el "backend" como el "frontend" fácilmente.

### Paso 1: Configurar el Proyecto para Producción

Necesitamos que el servidor (Node) sirva también los archivos del frontend (React) para tener todo en un solo sitio (más fácil y gratis).

1.  **Build del Frontend:**
    En la carpeta `client`, ejecuta:
    ```bash
    npm run build
    ```
    Esto crea una carpeta `dist` con tu web optimizada.

2.  **Servir Frontend desde el Backend:**
    Modificar `server/index.js` (o `start_server.js` y `server/src/app.js`) para servir los estáticos.
    *   *Si quieres que yo haga este cambio automáticamente, dímelo.*

### Paso 2: Crear el servicio en Render

1.  Sube tu código a GitHub (ya lo hemos hecho).
2.  Crea una cuenta en [dashboard.render.com](https://dashboard.render.com/).
3.  Click **New +** -> **Web Service**.
4.  Conecta tu repositorio de GitHub.
5.  **Configuración:**
    *   **Name:** `party-games-gonza` (o lo que quieras).
    *   **Runtime:** Node.
    *   **Build Command:** `npm install && cd client && npm install && npm run build` (Esto instala todo y compila el React).
    *   **Start Command:** `node start_server.js`
    *   **Environment Variables:**
        *   `NODE_ENV`: `production`
6.  Click **Create Web Service**.

Render détectará tu backend, compilará el frontend y te dará una URL (ej: `https://party-games.onrender.com`) que podrás pasar por WhatsApp a todos.

---

## Paso 3: Verificar el Despliegue

1.  Entra en la URL que te da Render.
2.  Crea una sala.
3.  Conecta desde tu móvil con datos (4G) para verificar que es accesible desde fuera.
