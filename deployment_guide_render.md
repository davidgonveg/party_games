# Guía de Despliegue en Render (Fullstack)

Ahora que hemos unificado el servidor, el despliegue es muy sencillo.

## Pasos para TI (El Usuario)

1.  **Subir cambios a GitHub**:
    Yo me encargo de esto en el siguiente paso (commit & push).

2.  **Crear cuenta en Render**:
    Ve a [dashboard.render.com](https://dashboard.render.com/) y regístrate (puedes usar tu cuenta de GitHub).

3.  **Crear el Servicio Web**:
    *   Pulsa en **"New +"** y selecciona **"Web Service"**.
    *   Selecciona "Build and deploy from a Git repository".
    *   Conecta tu repositorio `party_games` (o como lo hayas llamado).

4.  **Configurar el Servicio**:
    Rellena los campos con estos datos EXACTOS:
    *   **Name:** `party-games` (o lo que quieras)
    *   **Region:** Frankfurt (o la más cercana)
    *   **Branch:** `main` (o `master`)
    *   **Runtime:** `Node`
    *   **Build Command:** `npm install && cd client && npm install && npm run build`
        *(Esto instala todo y crea la versión optimizada del frontend)*
    *   **Start Command:** `node start_server.js`
    *   **Plan Type:** Free

5.  **Variables de Entorno (Environment Variables)**:
    Baja hasta "Advanced" o "Environment Variables" y añade:
    *   `NODE_ENV` = `production`

6.  **Desplegar**:
    Dale a **"Create Web Service"**.
    Render empezará a trabajar (tardará unos 2-3 minutos). Si todo va bien, te dará una URL tipo `https://party-games-xyz.onrender.com`.

¡Esa URL es la que mandas por WhatsApp a tus amigos!

## Notas Importantes
*   **Velocidad:** El plan gratuito de Render "duerme" el servidor si nadie lo usa en 15 minutos. La primera vez que entres puede tardar 30-50 segundos en arrancar. Luego vuelan.
