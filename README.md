# Realtime Game Room

Fastest Finger First + Lucky 7 for Microsoft Teams.

## Design
- 8 fixed users: 7 players + 1 admin
- No database
- No permanent game/session storage
- Scores exist only in server memory and disappear when the process restarts
- Real-time game state is synchronized to all connected browsers through WebSockets
- 10 Fastest Finger First questions
- Admin-controlled timer
- Question is published only when Admin presses START
- Timer is synchronized from the server
- When time expires, the question is automatically revealed
- First player to click an answer becomes the winner
- Correct answer = +10 points; Lucky 7 prediction = +20 points; incorrect = 0
- Lucky 7 has 5 rounds, with two dice and three predictions: BELOW 7 (+10), LUCKY 7 (+20), or ABOVE 7 (+10)

## Fixed login credentials

- Siow Ting (player) — `siowting.how@conduent.com` — password: `Tw6@HGsP`
- Saurabh Kumar (player) — `saurabh.kumar3@conduent.com` — password: `Rj6%j90h`
- Vikas Tyagi (player) — `vikas.tyagi2@conduent.com` — password: `Yb8#xLLv`
- Yogesh Sharma (player) — `yogesh.sharma@conduent.com` — password: `Yi6$Gifl`
- Dipanshu Jadon (player) — `dipanshu.jadon@conduent.com` — password: `Kk6#eKal`
- Swatantra Sagar (player) — `swatantra.sagar@conduent.com` — password: `Yj0!SBA4`
- Gowshitha P (player) — `Gowshitha.P@conduent.com` — password: `Dt6!2pcv`
- Prateek Gupta (admin) — `prateek.gupta2@conduent.com` — password: `Qd6#tFyP`

## Run locally
1. Install Node.js 18+.
2. Open a terminal in this folder.
3. Run `npm install`
4. Run `npm start`
5. Open `http://localhost:3000`
6. Admin logs in on one screen; players use the same URL on their devices.

## Teams
Share the deployed HTTPS URL in Microsoft Teams. Each participant logs in with their fixed credentials.

## Deploy
This is designed for a small free Node/WebSocket host. The service must support persistent WebSocket connections. Do not use a purely static host such as GitHub Pages for the server portion.
