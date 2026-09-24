DRAGON LIFE — instalare pe telefon + notificări
================================================

App-ul rulează pe Vercel + OneSignal (push gratis, funcționează și cu app-ul închis).

────────────────────────────────────────────────
1) DEPLOY PE VERCEL (o singură dată)
────────────────────────────────────────────────
• Urcă folderul „app Ionut" pe GitHub (drag & drop pe github.com).
• vercel.com/new → Import repo → Deploy.
• Primești un link tip: https://dragon-life.vercel.app

────────────────────────────────────────────────
2) ENV VARS ÎN VERCEL (o singură dată)
────────────────────────────────────────────────
Vercel dashboard → Project → Settings → Environment Variables:

  ONESIGNAL_APP_ID       = 4170c90f-14dd-4985-899f-02f6642a8f0b
  ONESIGNAL_REST_API_KEY = <cheia REST din dashboard.onesignal.com>

Apoi Redeploy (Deployments → ultimul → „…" → Redeploy).

────────────────────────────────────────────────
3) INSTALARE PE TELEFON
────────────────────────────────────────────────
iPhone (Safari):
  • Deschide linkul Vercel
  • Share → „Add to Home Screen"
  • Deschide de pe Home Screen
  • Meniu → permite notificările

Android (Chrome):
  • Deschide linkul Vercel
  • Meniu → „Install app" / „Add to Home Screen"
  • Permite notificările la prompt

────────────────────────────────────────────────
CUM FUNCȚIONEAZĂ NOTIFICĂRILE
────────────────────────────────────────────────
Când adaugi un task cu oră de start / end, app-ul cheamă
`/api/index?action=schedule` care programează push-ul pe OneSignal.
OneSignal trimite notificarea la ora exactă — telefonul o primește
chiar dacă app-ul e închis.

────────────────────────────────────────────────
CÂND MODIFICI CEVA
────────────────────────────────────────────────
1. Urci fișierele modificate pe GitHub (drag & drop).
2. Vercel face redeploy automat în ~1 min.
3. Deschizi app-ul pe telefon — se actualizează singur.

FIȘIERE (curat):
  index.html               UI
  app.js                   logică
  styles.css               design
  manifest.webmanifest     PWA (install)
  service-worker.js        offline + auto-update
  OneSignalSDKWorker.js    push notifications worker
  icon.svg                 iconiță
  api/index.js             endpoint OneSignal (schedule/cancel/test)
  package.json             (gol — Vercel are nevoie doar de existența lui)
  vercel.json              config cache
