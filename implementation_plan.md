# Production Deployment Setup

## Goal Description
To allow cloud deployment (e.g., on Render), the Node.js backend must serve the compiled React frontend. This setup eliminates the need for two separate servers in production, simplifying the deployment process.

## User Review Required
> [!NOTE]
> This change mainly affects production environments (`NODE_ENV=production`). Local development will continue to use the Vite dev server for HMR.

## Proposed Changes

### Backend

#### [MODIFY] [server.js](file:///c:/Users/gonza/Documents/party_games/server/server.js)
- Import `path` module.
- Add middleware to serve static files from `../client/dist` (where Vite builds the app).
- Add a "catch-all" route (`*`) to serve `index.html` for any non-API request (enabling React Router to handle client-side routing).
- Ensure this logic runs or is available. Standard practice is to always enable it, or conditionally if we want to be strict, but always enabling it after API routes is safe.

### Build Script
- We need to ensure the `client` is built before the server starts in production.
- We will assume the deployment command handles `npm run build` in client.

## Verification Plan

### Manual Verification
1.  Run `npm run build` in `client/` to generate the `dist` folder.
2.  Stop the `npm run dev` frontend server.
3.  Restart the backend `node start_server.js`.
4.  Visit `http://localhost:3001` (backend port).
5.  **Verify**: The React app loads correctly, verifying that the backend is serving the frontend.
