FormEase — NxtGen Creators
=========================

Project summary
---------------
FormEase is a web app (React + Vite + TypeScript) paired with a TypeScript Express backend. It helps users fill government-style forms (Aadhaar, Passport, Voter ID) with a visual UI and a voice/NLP assistant that can extract field values from natural language.

High level tech
---------------
- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Backend: Node + Express (TypeScript, ESM)
- Auth & Storage: Firebase (Firestore)
- NLP: OpenAI (chat completions), with a local regex fallback
- Utilities: TanStack Query, PDF generation via pdf-lib

Repository layout (important files)
----------------------------------
- `package.json` — scripts & dependencies
- `vite.config.ts` — dev server on port 8080 with proxy /api -> http://localhost:5000
- `src/` — frontend source
  - `App.tsx` — app entry
  - `pages/FormFillingPage.tsx` — main form + voice assistant integration
  - `components/VoiceAssistant.tsx` — voice UI and client-side NLP hook wiring
  - `lib/firebaseService.ts` — shared types & Firebase helpers
  - `lib/storage.ts` — Firebase storage adapter used by backend
  - `hooks/useNlpProcessor.ts` — client-side hook for NLP (local / cloud)
- `server/` — backend
  - `index.ts` — backend entrypoint (ts-node friendly)
  - `routes.ts` — Express routes (authentication, drafts, form-types, welcome message)
  - `nlp-processor.ts` — server-side NLP wrapper (OpenAI + local fallback)

Scripts (from package.json)
---------------------------
- dev — starts Vite dev server (frontend) on port 8080
- start:server — starts backend using `ts-node server/index.ts`
- build — builds frontend
- preview — preview built frontend
- lint — runs ESLint

Environment variables
---------------------
The app depends on several environment variables. Set them in your shell (or a `.env` mechanism you prefer).
- OPENAI_API_KEY — API key for OpenAI (optional; NLP has a local fallback)
- JWT_SECRET — JWT secret used by server auth (defaults to `secret` in code if not provided)
- FIREBASE envs for frontend (Vite):
  - VITE_FIREBASE_API_KEY
  - VITE_FIREBASE_AUTH_DOMAIN
  - VITE_FIREBASE_PROJECT_ID
  - VITE_FIREBASE_STORAGE_BUCKET
  - VITE_FIREBASE_MESSAGING_SENDER_ID
  - VITE_FIREBASE_APP_ID

Ports and proxy
---------------
- Frontend dev: http://localhost:8080 (Vite)
- Backend: http://localhost:5000 (Express)
- Vite proxies `/api/*` to `http://localhost:5000`. If you see `ECONNREFUSED` from Vite, ensure the backend is running.

Backend API (quick reference)
----------------------------
The backend is in `server/routes.ts`. Key endpoints:
- POST /api/auth/register — register user (payload validated with zod)
- POST /api/auth/login — login (returns JWT)
- POST /api/auth/logout — logout (requires Authorization header)
- GET /api/user/profile — get current user profile (requires Authorization)

Drafts (auth required)
- POST /api/drafts — create a draft (body: formTypeId, name, data)
- GET /api/drafts — get current user's drafts
- GET /api/drafts/:id — get single draft
- DELETE /api/drafts/:id — delete draft

Public
- GET /api/form-types — list available form types
- GET /api/welcome-message/:formCode — quick welcome message for a form (simple placeholder implementation)

NLP/Voice Integration
---------------------
- Server NLP is implemented in `server/nlp-processor.ts`. It calls OpenAI (model set to `gpt-4o`) and falls back to local regex-based extraction when OpenAI is unavailable or fails.
- Client voice assistant is in `src/components/VoiceAssistant.tsx`. It expects `FormSectionWithFields[]` shaped sections (see `src/lib/firebaseService.ts` types).
- Client transforms form JSON (from `src/data/*.json`) into a simplified structure used by the voice assistant. The voice assistant calls local client hooks or server endpoints depending on configuration.

Database expectations (Firestore collections)
-------------------------------------------
The Firebase adapter expects these collections (naming used in code):
- users
- userSessions
- formTypes
- formSections
- formFields
- formDrafts
- formSubmissions
- messages

If you run locally without Firebase, many backend functions will fail. For basic local testing you can stub `storage` or populate Firestore accordingly.

Common issues and troubleshooting
--------------------------------
- ECONNREFUSED when Vite proxies to /api: Backend is not running. Start it with:

```powershell
npm run start:server
```

- ESM import errors ("Cannot find module '../src/lib/firebaseService'"): Node's ESM loader + TypeScript requires file extension for local imports when running via ts-node/ESM. The code base has been updated to use explicit `.ts` extensions for local imports in `server/` files. If you add new local imports in `server`, include `.ts` extension.

- OpenAI not responding / billing issues: the server falls back to local regex-based NLP in `server/nlp-processor.ts`. To enable OpenAI set `OPENAI_API_KEY` in your environment.

- Firebase auth errors: ensure Firestore rules & config are correct and env vars are set. For local-only dev, consider mocking `src/lib/storage.ts` or pointing to an emulator.

How to run locally (recommended dev flow)
----------------------------------------
1) Install deps:

```powershell
npm install
```

2) Start backend in one terminal (server listens on 5000):

```powershell
npm run start:server
```

3) Start frontend in another terminal (Vite on 8080):

```powershell
npm run dev
```

4) Open http://localhost:8080 in your browser. If the app appears blank, open the browser console and the terminal running Vite to inspect frontend errors. If you see proxy errors, check backend terminal.

Notes about ts-node & ESM
------------------------
This project runs the backend using `ts-node` and ESM. A couple of rules to remember:
- Always use the `.ts` extension on local imports inside `server/*.ts` files (e.g. `import { foo } from './bar.ts'`).
- Keep `type: "module"` in `package.json` if you want to keep ESM semantics.

Testing and linting
-------------------
- Lint:

```powershell
npm run lint
```

- There are no automated unit tests included; adding tests (Jest / Vitest) is a good next step.

Development notes & TODOs
------------------------
- Wire server NLP endpoints to client voice assistant to support server-side NLP calls (the server NLP logic exists but is not yet fully wired through REST endpoints).
- Add integration tests for API routes and NLP fallback logic.
- Improve Auth error handling and token refresh logic.
- Add a small README or schema for Firestore collections to ease local DB seeding.

Who to contact / contributor notes
---------------------------------
- Repository owner: Manideep667320 (local workspace owner)
- I updated several small issues to make the backend startable with ts-node and ESM: added explicit `.ts` extensions to local imports in `server/` and adjusted TypeScript interfaces used by NLP code.

License
-------
MIT (adjust as needed)


Status & next steps (what I did for you now)
--------------------------------------------
- Analyzed the codebase and created this README.
- Fixed ESM import extension issues in `server/nlp-processor.ts` and reconciled types in `src/lib/firebaseService.ts` so server code can access `FormSectionWithFields` shape.

If you want, I can:
- Add a small script to run both server + client concurrently (e.g., using `concurrently`).
- Add a Postman / Swagger spec for the API routes.
- Add a short Firestore seeding script for dev.


