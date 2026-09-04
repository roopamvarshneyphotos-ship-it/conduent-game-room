const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "public");

const users = [
  {
    "email": "siowting.how@conduent.com",
    "name": "Siow Ting",
    "role": "player"
  },
  {
    "email": "saurabh.kumar3@conduent.com",
    "name": "Saurabh Kumar",
    "role": "player"
  },
  {
    "email": "vikas.tyagi2@conduent.com",
    "name": "Vikas Tyagi",
    "role": "player"
  },
  {
    "email": "yogesh.sharma@conduent.com",
    "name": "Yogesh Sharma",
    "role": "player"
  },
  {
    "email": "dipanshu.jadon@conduent.com",
    "name": "Dipanshu Jadon",
    "role": "player"
  },
  {
    "email": "swatantra.sagar@conduent.com",
    "name": "Swatantra Sagar",
    "role": "player"
  },
  {
    "email": "Gowshitha.P@conduent.com",
    "name": "Gowshitha P",
    "role": "player"
  },
  {
    "email": "prateek.gupta2@conduent.com",
    "name": "Prateek Gupta",
    "role": "admin"
  }
];
const questions = [{"text": "What is the capital of India?", "options": ["Mumbai", "New Delhi", "Kolkata", "Chennai"], "answer": 1}, {"text": "Which planet is known as the Red Planet?", "options": ["Venus", "Mars", "Jupiter", "Mercury"], "answer": 1}, {"text": "How many days are there in a leap year?", "options": ["365", "366", "364", "367"], "answer": 1}, {"text": "Which is the largest ocean on Earth?", "options": ["Atlantic", "Indian", "Pacific", "Arctic"], "answer": 2}, {"text": "Which language is primarily used to style web pages?", "options": ["HTML", "CSS", "SQL", "Python"], "answer": 1}, {"text": "What is 12 \u00d7 8?", "options": ["86", "96", "108", "112"], "answer": 1}, {"text": "Which animal is known as the King of the Jungle?", "options": ["Tiger", "Lion", "Elephant", "Leopard"], "answer": 1}, {"text": "Which gas do plants absorb from the atmosphere?", "options": ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], "answer": 2}, {"text": "How many sides does a hexagon have?", "options": ["5", "6", "7", "8"], "answer": 1}, {"text": "Which is the fastest land animal?", "options": ["Horse", "Cheetah", "Leopard", "Gazelle"], "answer": 1}];
const passwordMap = {
  "siowting.how@conduent.com": "Tw6@HGsP",
  "saurabh.kumar3@conduent.com": "Rj6%j90h",
  "vikas.tyagi2@conduent.com": "Yb8#xLLv",
  "yogesh.sharma@conduent.com": "Yi6$Gifl",
  "dipanshu.jadon@conduent.com": "Kk6#eKal",
  "swatantra.sagar@conduent.com": "Yj0!SBA4",
  "Gowshitha.P@conduent.com": "Dt6!2pcv",
  "prateek.gupta2@conduent.com": "Qd6#tFyP"
};

const sessions = new Map();
const clients = new Set();

const state = {
  game: "fff",
  status: "lobby", // lobby, question, buzzed, revealed, lucky7
  questionIndex: 0,
  timerSeconds: 10,
  timerEndsAt: null,
  winnerId: null,
  winnerName: null,
  answerLocked: false,
  selectedAnswer: null,
  lastAnswerCorrect: null,
  scores: Object.fromEntries(users.map(u => [u.email, 0])),
  luckyRound: 0,
  luckyDice: null,
  luckyPrediction: {},
  luckyResult: null
};

function safeUser(email) {
  const u = users.find(x => x.email.toLowerCase() === String(email).toLowerCase());
  return u ? { email: u.email, name: u.name, role: u.role } : null;
}

function broadcast(obj) {
  for (const c of clients) {
    if (c.readyState !== WebSocket.OPEN) continue;
    // Build a personalized state so each player keeps their own Lucky 7 selection.
    if (obj && obj.type === "state") {
      c.send(JSON.stringify({type:"state", state: publicState(c.email || "")}));
    } else {
      c.send(JSON.stringify(obj));
    }
  }
}

function publicState(forEmail) {
  const q = questions[state.questionIndex];
  const isAdmin = safeUser(forEmail)?.role === "admin";
  const timerRemaining = state.timerEndsAt
    ? Math.max(0, Math.ceil((state.timerEndsAt - Date.now()) / 1000))
    : 0;

  return {
    game: state.game,
    status: state.status,
    questionNumber: state.questionIndex + 1,
    totalQuestions: questions.length,
    question: (state.status === "question" || state.status === "buzzed" || state.status === "revealed")
      ? { text: q.text, options: q.options }
      : null,
    timerSeconds: state.timerSeconds,
    timerRemaining,
    timerEndsAt: state.timerEndsAt,
    winnerId: state.winnerId,
    winnerName: state.winnerName,
    answerLocked: state.answerLocked,
    selectedAnswer: isAdmin || state.status === "revealed" ? state.selectedAnswer : null,
    lastAnswerCorrect: isAdmin || state.status === "revealed" ? state.lastAnswerCorrect : null,
    correctAnswer: isAdmin || state.status === "revealed" ? q.answer : null,
    scores: state.scores,
    luckyRound: state.luckyRound,
    luckyDice: state.luckyDice,
    luckyPrediction: state.luckyPrediction[forEmail] || null,
    luckyResult: state.luckyResult,
    users: users.map(u => ({...u}))
  };
}

function sendState(ws, email) {
  ws.send(JSON.stringify({type:"state", state: publicState(email)}));
}

function resetQuestion() {
  state.status = "lobby";
  state.timerEndsAt = null;
  state.winnerId = null;
  state.winnerName = null;
  state.answerLocked = false;
  state.selectedAnswer = null;
  state.lastAnswerCorrect = null;
}

function startTimer() {
  state.timerEndsAt = Date.now() + state.timerSeconds * 1000;
}

function endTimer() {
  if (state.status === "question" && state.timerEndsAt && Date.now() >= state.timerEndsAt) {
    state.timerEndsAt = null;
    state.status = "revealed";
    state.answerLocked = true;
    state.winnerId = null;
    state.winnerName = null;
    state.lastAnswerCorrect = null;
    broadcast({type:"state", state: publicState("")});
  }
}

setInterval(endTimer, 100);

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = path.join(publicDir, p);
  if (!file.startsWith(publicDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end("Not found");
  }
  const ext = path.extname(file);
  const types = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json"};
  res.writeHead(200, {"Content-Type": types[ext] || "application/octet-stream", "Cache-Control":"no-store"});
  fs.createReadStream(file).pipe(res);
});

const wss = new WebSocket.Server({server});

wss.on("connection", ws => {
  clients.add(ws);
  ws.email = null;
  ws.on("message", raw => {
    let m;
    try { m = JSON.parse(raw.toString()); } catch { return; }

    if (m.type === "login") {
      const user = safeUser(m.email);
      if (!user || passwordMap[user.email] !== m.password) {
        ws.send(JSON.stringify({type:"login_error", message:"Invalid email or password."}));
        return;
      }
      const token = crypto.randomUUID();
      sessions.set(token, user.email);
      ws.email = user.email;
      ws.send(JSON.stringify({type:"login_ok", token, user}));
      sendState(ws, user.email);
      return;
    }

    if (!ws.email) return;
    const me = safeUser(ws.email);
    if (!me) return;

    if (m.type === "admin_set_timer" && me.role === "admin") {
      const n = Math.max(1, Math.min(300, Number(m.seconds) || 10));
      state.timerSeconds = n;
      broadcast({type:"state", state: publicState(ws.email)});
    }

    if (m.type === "admin_start" && me.role === "admin") {
      if (state.game === "fff") {
        state.status = "question";
        state.winnerId = null;
        state.winnerName = null;
        state.answerLocked = false;
        state.selectedAnswer = null;
        state.lastAnswerCorrect = null;
        startTimer();
        broadcast({type:"state", state: publicState("")});
      }
    }

    if (m.type === "answer" && me.role === "player") {
      // First player to click an answer wins the question.
      if (state.game !== "fff" || state.status !== "question" || state.answerLocked) return;
      if (state.timerEndsAt && Date.now() >= state.timerEndsAt) { endTimer(); return; }

      const idx = Number(m.answer);
      if (!Number.isInteger(idx) || idx < 0 || idx >= questions[state.questionIndex].options.length) return;

      state.winnerId = me.email;
      state.winnerName = me.name;
      state.selectedAnswer = idx;
      state.lastAnswerCorrect = idx === questions[state.questionIndex].answer;
      if (state.lastAnswerCorrect) state.scores[me.email] += 10;

      state.answerLocked = true;
      state.status = "revealed";
      state.timerEndsAt = null;
      broadcast({type:"state", state: publicState("")});
    }

    if (m.type === "admin_reveal" && me.role === "admin") {
      if (state.game === "fff" && (state.status === "question" || state.status === "buzzed")) {
        state.timerEndsAt = null;
        state.status = "revealed";
        state.answerLocked = true;
        broadcast({type:"state", state: publicState("")});
      }
    }

    if (m.type === "admin_next" && me.role === "admin") {
      if (state.game === "fff") {
        if (state.questionIndex < questions.length - 1) state.questionIndex++;
        else state.questionIndex = 0;
        resetQuestion();
        broadcast({type:"state", state: publicState("")});
      }
    }

    if (m.type === "admin_reset" && me.role === "admin") {
      state.questionIndex = 0;
      state.timerSeconds = 10;
      state.game = "fff";
      state.luckyRound = 0;
      state.luckyDice = null;
      state.luckyPrediction = {};
      state.luckyResult = null;
      for (const u of users) state.scores[u.email] = 0;
      resetQuestion();
      broadcast({type:"state", state: publicState("")});
    }

    // Lucky 7: five rounds. Players predict whether two dice will total 7.
    if (m.type === "admin_lucky_start" && me.role === "admin") {
      state.game = "lucky7";
      state.status = "lucky7";
      state.luckyRound = 1;
      state.luckyDice = null;
      state.luckyPrediction = {};
      state.luckyResult = null;
      broadcast({type:"state", state: publicState("")});
    }

    if (m.type === "lucky_predict" && me.role === "player") {
      if (state.game !== "lucky7" || state.status !== "lucky7" || state.luckyDice) return;
      if (!["below","lucky","above"].includes(m.value)) return;
      state.luckyPrediction[me.email] = m.value;
      broadcast({type:"state", state: publicState("")});
    }

    if (m.type === "admin_roll" && me.role === "admin") {
      if (state.game !== "lucky7" || state.status !== "lucky7" || state.luckyDice) return;
      const d1 = 1 + Math.floor(Math.random()*6);
      const d2 = 1 + Math.floor(Math.random()*6);
      state.luckyDice = [d1,d2];
      const total = d1 + d2;
      const result = total < 7 ? "below" : total === 7 ? "lucky" : "above";
      state.luckyResult = result;
      for (const u of users) {
        if (u.role === "player" && state.luckyPrediction[u.email] === result) {
          state.scores[u.email] += result === "lucky" ? 20 : 10;
        }
      }
      broadcast({type:"state", state: publicState("")});
    }

    if (m.type === "admin_lucky_next" && me.role === "admin") {
      if (state.game !== "lucky7" || state.status !== "lucky7") return;
      if (state.luckyRound >= 5) {
        state.game = "fff";
        state.questionIndex = 0;
        state.luckyRound = 0;
        state.luckyDice = null;
        state.luckyPrediction = {};
        state.luckyResult = null;
        resetQuestion();
      } else {
        state.luckyRound++;
        state.luckyDice = null;
        state.luckyPrediction = {};
        state.luckyResult = null;
      }
      broadcast({type:"state", state: publicState("")});
    }
  });

  ws.on("close", () => clients.delete(ws));
});

server.listen(PORT, () => console.log(`Realtime Game Room running on port ${PORT}`));
