# GitHub Integration

- From https://console.firebase.google.com/, create a new project:
  - **Project name:** `OpenCOR`
  - **Project ID:** `opencorapp`
- From https://console.firebase.google.com/project/opencorapp/overview, add a Web app:
  - **App nickname:** `OpenCOR Web app`
- From https://console.firebase.google.com/project/opencorapp/authentication/providers:
  - Enable the GitHub authentication provider; and
  - Provide the **Client ID** and **Client secret** by creating a new OAuth app from https://github.com/settings/developers:
    - **Application name:** OpenCOR
    - **Homepage URL:** https://opencor.ws/
    - **Authorization callback URL:** https://opencorapp.firebaseapp.com/__/auth/handler

    The OAuth app created, note down the **Client ID** and **Client secret** (that you got by clicking on the "Generate a new client secret" button).
- From https://console.firebase.google.com/project/opencorapp/authentication/settings, ensure that "Authorised domains" includes both:
  - `opencor.ws`; and
  - `localhost` (so that the desktop version of OpenCOR, which serves the UI from `http://localhost:<port>`, can complete GitHub OAuth flows).
- Either export the following environment variables in your development environment or create a `.env.local` file in `src/renderer` with the following contents:
  ```
  VITE_FIREBASE_API_KEY=<API_KEY>
  VITE_FIREBASE_AUTH_DOMAIN=<AUTH_DOMAIN>
  VITE_FIREBASE_PROJECT_ID=<PROJECT_ID>
  VITE_FIREBASE_STORAGE_BUCKET=<STORAGE_BUCKET>
  VITE_FIREBASE_MESSAGING_SENDER_ID=<MESSAGING_SENDER_ID>
  VITE_FIREBASE_APP_ID=<APP_ID>
  VITE_FIREBASE_MEASUREMENT_ID=<MEASUREMENT_ID>
  ```
