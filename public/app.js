let ws,me,state;
const $=x=>document.getElementById(x);
function connect(){ws=new WebSocket((location.protocol==="https:"?"wss://":"ws://")+location.host);ws.onmessage=e=>msg(JSON.parse(e.data));ws.onclose=()=>setTimeout(connect,1000)}
connect();
function send(type,data={}){if(ws&&ws.readyState===1)ws.send(JSON.stringify({type,...data}))}
$("loginBtn").onclick=()=>send("login",{email:$("email").value.trim(),password:$("password").value});
$("logout").onclick=()=>location.reload();
function msg(m){if(m.type==="login_error"){$("err").textContent=m.message;return}if(m.type==="login_ok"){me=m.user;$("login").classList.add("hidden");$("game").classList.remove("hidden");$("name").textContent=me.name;$("role").textContent=me.role; if(me.role==="admin")$("admin").classList.remove("hidden");render()}if(m.type==="state"){state=m.state;render()}}
setInterval(()=>{if(state&&state.timerEndsAt&&state.status==="question"){const n=Math.max(0,Math.ceil((state.timerEndsAt-Date.now())/1000));$("timer").textContent=n}else if(state){$("timer").textContent="00"}},100);

function render(){if(!state)return;renderBoard();if(me.role==="admin")renderAdmin();renderPlayer()}
function renderAdmin(){
 $("qno").textContent=`Question ${state.questionNumber} of ${state.totalQuestions}`;
 $("timerInput").value=state.timerSeconds;
 $("start").disabled=state.game!=="fff"||state.status!=="lobby";
 $("reveal").disabled=state.game!=="fff"||!["question","revealed"].includes(state.status)||state.status==="revealed";
 $("next").disabled=state.game!=="fff"||state.status!=="revealed";
 $("fffAdmin").classList.toggle("hidden",tab!=="fff");$("luckyAdmin").classList.toggle("hidden",tab!=="lucky");
 $("adminQuestion").innerHTML=state.question?questionHTML(true):'<div class="status">Press START to show the question.</div>';
 $("adminLucky").innerHTML=luckyHTML(true);
 $("roll").disabled=state.game!=="lucky7"||!!state.luckyDice;
 $("lnext").disabled=state.game!=="lucky7"||!state.luckyDice;
}
function questionHTML(admin){
 if(!state.question)return "";
 let h='<div class="question"><div class="qtext">'+esc(state.question.text)+'</div><div class="options">';
 state.question.options.forEach((o,i)=>{let c="answer";if(state.status==="revealed"&&state.selectedAnswer===i)c+=" "+(state.lastAnswerCorrect?"correct":"wrong");if(state.status==="revealed"&&state.correctAnswer===i)c+=" correct";h+=`<button class="${c}" disabled>${String.fromCharCode(65+i)}. ${esc(o)}</button>`});
 h+='</div>';
 if(state.winnerName)h+=`<div class="winner">🏆 Winner: ${esc(state.winnerName)} ${state.lastAnswerCorrect?"— Correct (+10)":"— Incorrect (0)"}</div>`;
 else if(state.status==="revealed")h+='<div class="status">⏰ Time complete — no answer.</div>';
 return h+'</div>';
}
function renderPlayer(){
 if(state.game==="lucky7"){$("title").textContent=`Lucky 7 • Round ${state.luckyRound} of 5`;$("content").innerHTML=luckyHTML(false);bindChoices();return}
 $("title").textContent=`Fastest Finger First • Question ${state.questionNumber} of ${state.totalQuestions}`;
 if(state.status==="lobby")$("content").innerHTML='<div class="status">Waiting for Admin to press START.</div>';
 else if(state.status==="question"){
   let h=`<div class="question"><div class="qtext">${esc(state.question.text)}</div><div class="options">`;
   state.question.options.forEach((o,i)=>h+=`<button class="answer" data-answer="${i}">${String.fromCharCode(65+i)}. ${esc(o)}</button>`);
   $("content").innerHTML=h+"</div></div>";
   document.querySelectorAll("[data-answer]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-answer]").forEach(x=>x.disabled=true);send("answer",{answer:+b.dataset.answer})});
 }else $("content").innerHTML=questionHTML(false);
}
function luckyHTML(admin){
 if(state.game!=="lucky7")return admin?'<div class="status">Press START LUCKY 7.</div>':'<div class="status">Waiting for Admin.</div>';
 let h=`<div class="status">Round ${state.luckyRound} of 5</div>`;
 if(!state.luckyDice&&!admin){
   const p=state.luckyPrediction;
   h+=`<div class="prediction">
   <button class="choice ${p==="below"?"selected":""}" id="below">⬇️ BELOW 7</button>
   <button class="choice ${p==="lucky"?"selected":""}" id="lucky">🎯 LUCKY 7<br><small>+20 points</small></button>
   <button class="choice ${p==="above"?"selected":""}" id="above">⬆️ ABOVE 7</button></div>`;
   if(p)h+=`<div class="status">Your selection: <b>${p==="below"?"BELOW 7":p==="lucky"?"LUCKY 7":"ABOVE 7"}</b></div>`;
 }else if(state.luckyDice){
   const [a,b]=state.luckyDice,total=a+b,l={below:"BELOW 7",lucky:"LUCKY 7",above:"ABOVE 7"};
   h+=`<div class="dice">🎲 ${a} &nbsp; ${b} 🎲</div><div class="winner">Total = ${total} → ${l[state.luckyResult]}</div>`;
   if(!admin&&state.luckyPrediction)h+=`<div class="status">${state.luckyPrediction===state.luckyResult?"✅ Correct":"❌ Incorrect"} — ${state.luckyPrediction===state.luckyResult?(state.luckyResult==="lucky"?"+20":"+10"):"+0"} points</div>`;
 }else if(admin)h+='<div class="status">Players are selecting. Then roll the dice.</div>';
 return h;
}
function bindChoices(){const map={below:"below",lucky:"lucky",above:"above"};Object.keys(map).forEach(k=>{const b=$(k);if(b)b.onclick=()=>{["below","lucky","above"].forEach(x=>{if($(x))$(x).disabled=true});send("lucky_predict",{value:k})}})}
let tab="fff";
$("fffTab").onclick=()=>{tab="fff";$("fffTab").classList.add("active");$("luckyTab").classList.remove("active");render()};
$("luckyTab").onclick=()=>{tab="lucky";$("luckyTab").classList.add("active");$("fffTab").classList.remove("active");render()};
$("timerInput").onchange=()=>send("admin_set_timer",{seconds:+$("timerInput").value});
$("start").onclick=()=>send("admin_start");$("reveal").onclick=()=>send("admin_reveal");$("next").onclick=()=>send("admin_next");$("reset").onclick=()=>send("admin_reset");
$("lstart").onclick=()=>send("admin_lucky_start");$("roll").onclick=()=>send("admin_roll");$("lnext").onclick=()=>send("admin_lucky_next");
function renderBoard(){const a=Object.entries(state.scores).map(([email,score])=>({...state.users.find(u=>u.email===email),score})).filter(x=>x.role==="player").sort((a,b)=>b.score-a.score);$("board").innerHTML='<div class="rows">'+a.map((u,i)=>`<div class="r"><b>${i+1}</b><span>${esc(u.name)}</span><span class="score">${u.score}</span></div>`).join("")+'</div>'}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
