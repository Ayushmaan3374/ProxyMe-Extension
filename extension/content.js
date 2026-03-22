let recognition;

let triggerName = "assistant";
let contextText = "";
let meetingId = "";

let proxyEnabled = true;

let listeningStarted = false;

let pendingTranscript = "";
let speechTimeout = null;

let lastRequestTime = 0;

let lastUserQuery = "";
let lastAIResponse = "";


const SpeechRecognition =
window.SpeechRecognition || window.webkitSpeechRecognition;


/* ---------- CLEAN SPEECH ---------- */

function cleanSpeech(text){

return text
.replace(/\*\*/g,"")
.replace(/\*/g,"")
.replace(/#/g,"")
.replace(/_/g,"")
.replace(/`/g,"")
.replace(/\n/g," ")
.trim();

}
/* ---------- Better Approach ---------*/
const BASE_URL = "https://proxymeagent.onrender.com";

/* ---------- GET MEETING ID ---------- */

function getMeetingId(){

const url = window.location.href;

const match = url.match(/meet\.google\.com\/([a-zA-Z0-9-]+)/);

return match ? match[1] : "";

}


/* ---------- LOAD SETTINGS ---------- */

function loadSettings(callback){

chrome.storage.sync.get(
["representName","contextText","meetingUrl","proxyEnabled"],
(data)=>{

if(data.representName){
triggerName = data.representName.toLowerCase().trim();
}

if(data.contextText){
contextText = data.contextText;
}

if(data.meetingUrl){

const match =
data.meetingUrl.match(/meet\.google\.com\/([a-zA-Z0-9-]+)/);

if(match){
meetingId = match[1];
}

}

proxyEnabled = data.proxyEnabled !== false;

if(callback) callback();

});

}


/* ---------- WATCH STORAGE CHANGES ---------- */

chrome.storage.onChanged.addListener((changes)=>{

if(changes.proxyEnabled){

proxyEnabled = changes.proxyEnabled.newValue;

if(!proxyEnabled){

stopProxy();

}else{

startRecognition();

}

}

});


/* ---------- STOP PROXY ---------- */

function stopProxy(){

if(recognition){
try{
recognition.stop();
}catch(e){}
}

if(speechSynthesis.speaking){
speechSynthesis.cancel();
}

listeningStarted = false;

}


/* ---------- CHECK MEETING ---------- */

function isCorrectMeeting(){

const current = getMeetingId();

return current === meetingId;

}


/* ---------- TRIGGER DETECTION ---------- */

function detectTrigger(text){

const name =
triggerName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

const patterns = [

new RegExp(`\\b${name}\\b`,"i"),
new RegExp(`hey\\s+${name}`,"i"),
new RegExp(`${name}[,\\.]`,"i")

];

return patterns.some(p => p.test(text));

}


/* ---------- REMOVE TRIGGER ---------- */

function removeTrigger(text){

const name =
triggerName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

const regex =
new RegExp(`(hey\\s+)?\\b${name}\\b[,\\.]?`,"i");

return text.replace(regex,"").trim();

}

/* ---------- START RECOGNITION ---------- */

function startRecognition(){

if(!proxyEnabled) return;

if(listeningStarted) return;

recognition = new SpeechRecognition();

recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = "en-US";

listeningStarted = true;

recognition.onstart = ()=>{

chrome.runtime.sendMessage({
type:"state_listening"
});

};


/* ---------- SPEECH RESULT ---------- */

recognition.onresult = async (event)=>{

if(!proxyEnabled) return;

if(!isCorrectMeeting()) return;

const result =
event.results[event.results.length-1];

const transcript =
result[0].transcript.toLowerCase();

chrome.runtime.sendMessage({
type:"transcript",
text:transcript
});

if(speechSynthesis.speaking){
speechSynthesis.cancel();
}

if(!detectTrigger(transcript)) return;

pendingTranscript = transcript;

if(speechTimeout){
clearTimeout(speechTimeout);
}

speechTimeout = setTimeout(()=>{

processSpeech(pendingTranscript);

},1000);

};


/* ---------- RESTART ---------- */

recognition.onend = ()=>{

if(proxyEnabled &&
window.location.href.includes("meet.google.com")){
recognition.start();
}

};

recognition.start();

}


/* ---------- PROCESS SPEECH ---------- */

async function processSpeech(transcript){

if(!proxyEnabled) return;

if(Date.now() - lastRequestTime < 2000) return;

lastRequestTime = Date.now();

let cleanedQuery = removeTrigger(transcript);

if(!cleanedQuery) return;

if(speechSynthesis.speaking){
speechSynthesis.cancel();
}


let payload;

const followUpCommands = [

"continue",
"go on",
"simpler",
"shorter",
"summarize",
"example"

];

const isFollowUp =
followUpCommands.some(cmd =>
cleanedQuery.includes(cmd)
);

if(isFollowUp && lastUserQuery){

payload = {
  meeting_event:"follow_up",
  previous_question:lastUserQuery,
  previous_answer:lastAIResponse,
  instruction:cleanedQuery,
  meetingId:meetingId,
  representor_name: triggerName   // 🔥 FIX
};

}

else{

payload = {
  meeting_event:"trigger_detected",
  trigger_word:triggerName,
  speech_text:cleanedQuery,
  meetingId:meetingId,
  representor_name: triggerName   // 🔥 FIX
};

lastUserQuery = cleanedQuery;

}

try{

chrome.runtime.sendMessage({
type:"state_thinking"
});

const res = await fetch(
`${BASE_URL}/process`,
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify(payload)
}
);

if(!res.ok){
  throw new Error("Backend error");
}

const data = await res.json();

lastAIResponse = data.ai_response;

if(!proxyEnabled) return;

chrome.runtime.sendMessage({
type:"state_speaking"
});

const cleanText =
cleanSpeech(data.ai_response);

const speech =
new SpeechSynthesisUtterance(cleanText);

speech.onend = ()=>{

if(proxyEnabled){
chrome.runtime.sendMessage({
type:"state_listening"
});
}

};

speechSynthesis.speak(speech);

}
catch(e){

chrome.runtime.sendMessage({
type:"state_listening"
});

console.error("Backend error",e);

}

}

async function verifyMeetingFromServer(meetingId){
  try{
    const res = await fetch("https://proxymeagent.onrender.com/get-representors");
    const data = await res.json();

    return data.names.some(n => n.meeting_id === meetingId);
  }catch(e){
    console.error("Verification failed");
    return false;
  }
}

/* ---------- INIT ---------- */

window.addEventListener("load",()=>{

if(window.location.href.includes("meet.google.com")){

loadSettings(async ()=>{

  const currentId = getMeetingId();

  const isValid = await verifyMeetingFromServer(currentId);

  if(proxyEnabled && isValid){
  startRecognition();
} else {
  console.warn("❌ Listening blocked: invalid meeting or proxy disabled");
  stopProxy(); // ✅ ensures nothing runs
}

});

}

});