# Party Games App - Task List

- [ ] **Project Initialization**
    - [x] Create `implementation_plan.md` with technical details from original README
    - [x] Clean up `README.md` to be a standard project overview
    - [x] Initialize Git repository (if needed) and .gitignore
    - [x] Setup folder structure (`client` and `server`)
    - [x] Initialize `client` (Vite + React + Tailwind)
    - [x] Initialize `server` (Express + Socket.io)

- [x] **Phase 1: Core Room System**
    - [x] **Backend: Room Management**
        - [x] Implement `RoomManager` class (create, join, leave)
        - [x] Implement Socket.io connection handling
        - [x] Handle `createRoom` and `joinRoom` events
        - [x] Handle disconnections
    - [x] **Frontend: Lobby & Navigation**
        - [x] Create `GameContext` for socket management
        - [x] Implement `Home` screen (Create/Join buttons)
        - [x] Implement `Lobby` screen (List of players)
        - [x] Connect Lobby to backend events

- [x] **Phase 2: "Never Have I Ever" Game**
    - [x] **Backend: Logic**
        - [x] Implement `YoNuncaGame` class
        - [x] Question database/array
        - [x] Logic to serve next question
    - [x] **Frontend: UI**
        - [x] Create `YoNuncaGame` component
        - [x] Display current question
        - [x] (Optional) Tracking counters/scores
    - [x] **Phase 2.5: Hardening & Resilience**
        - [x] Implement session recovery on server
        - [x] Implement session check on Lobby/Game
        - [x] Add "Back" navigation buttons
        - [x] Fix Offline Mode (room creation race condition & DataCloneError)
        - [x] Fix Offline Selection Highlighting

- [ ] **Phase 3: "Impostor" Game**
    - [ ] **Backend: Logic**
        - [ ] Implement `ImpostorGame` class
        - [ ] Logic for word selection and role assignment
        - [ ] Timer management
        - [ ] Voting logic
    - [ ] **Frontend: UI**
        - [ ] Create `ImpostorGame` component structure
        - [ ] "Role Reveal" view
        - [ ] "Discussion" view with timer
        - [ ] "Voting" view
        - [ ] "Results" view

- [ ] **Phase 4: Polish & Deployment**
    - [ ] Mobile responsiveness checks
    - [ ] Simple deployment configuration (Vercel/Railway config files)
