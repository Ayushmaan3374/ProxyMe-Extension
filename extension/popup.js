// ---------- ELEMENTS ----------
const uploadPage = document.getElementById("uploadPage");
const uploadStatus = document.getElementById("uploadStatus");
const uploadBar = document.getElementById("uploadBar");
const closeBtn = document.getElementById("closeBtn");

const meetingLinkInput = document.getElementById("meetingLinkInput");
const meetingLinkLabel = document.getElementById("meetingLinkLabel");

const representPage = document.getElementById("representPage");
const contextPage = document.getElementById("contextPage");
const rolePage = document.getElementById("rolePage");
const hostPage = document.getElementById("hostPage");
const attendeePage = document.getElementById("attendeePage");

const representYes = document.getElementById("representYes");
const representNo = document.getElementById("representNo");

const repName = document.getElementById("repName");
const contextFile = document.getElementById("contextFile");
const saveContext = document.getElementById("saveContext");

const hostBtn = document.getElementById("hostBtn");
const attendeeBtn = document.getElementById("attendeeBtn");

const nameDisplay = document.getElementById("nameDisplay");
const nameDisplayAtt = document.getElementById("nameDisplayAtt");

const toggleBtnAtt = document.getElementById("toggleBtnAtt") || null;
const toggleBtn = document.getElementById("toggleBtn");
const transcriptBoxHost = document.getElementById("transcript");
const transcriptBoxAtt = document.getElementById("transcriptAtt");
const listeningPillAtt = document.getElementById("listeningPillAtt");
const listeningPill = document.getElementById("listeningPill");

let meetingUrl = "";

function extractMeetingId(url){
  const match = url.match(/meet\.google\.com\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : "";
}
// ---------- CLOSE ----------
if(closeBtn){
  closeBtn.onclick = ()=> window.close();
}

// ---------- 🔥 NEW: SMOOTH PROGRESS ----------
function animateProgress(target){
  let current = parseInt(uploadBar.style.width) || 0;

  const interval = setInterval(()=>{
    if(current >= target){
      clearInterval(interval);
    } else {
      current += 2;
      uploadBar.style.width = current + "%";
    }
  }, 20);
}

// ---------- VALIDATION ----------
function isValidMeetingLink(url){
  try{
    const parsed = new URL(url);
    return (
      parsed.href.includes("meet.google.com") ||
      parsed.href.includes("zoom.us") ||
      parsed.href.includes("teams.microsoft.com")
    );
  }catch{
    return false;
  }
}

// ---------- GET TAB ----------
async function getMeetingUrl(){
  const tabs = await chrome.tabs.query({
    active:true,
    currentWindow:true
  });

  if(tabs.length){
    meetingUrl = tabs[0].url;
  }
}

// ---------- PAGE SWITCH ----------
function show(page){
  [representPage,contextPage,rolePage,hostPage,attendeePage,uploadPage]
  .forEach(p=>{
    if(p) p.classList.remove("active");
  });

  page.classList.add("active");
}

// ---------- RESET ----------
function resetMeeting(){
  chrome.storage.sync.remove([
    "representing",
    "representName",
    "contextText",
    "role",
    "meetingUrl"
  ]);
}
// ---------- RESTORE ----------
async function restoreState(){

  await getMeetingUrl();

  chrome.storage.sync.get([
    "meetingUrl",
    "representName",
    "role",
    "proxyEnabled"
  ], async (data)=>{

    // 🔥 RESET IF DIFFERENT MEETING
    if(data.meetingUrl && data.meetingUrl !== meetingUrl){
      resetMeeting();
      show(representPage);
      return;
    }

    // 🔥 NORMAL FLOW (LOCAL DATA EXISTS)
    if(data.meetingUrl === meetingUrl){

      if(data.role === "host"){
        nameDisplay.innerText = data.representName;
        show(hostPage);
        updateToggleButton(data.proxyEnabled);
        return;
      }

      if(data.role === "attendee"){
        nameDisplayAtt.innerText = data.representName;
        show(attendeePage);
        updateToggleButton(data.proxyEnabled);
        return;
      }
    }

    show(representPage);
  });
}

// ---------- REPRESENT ----------
representYes.onclick = ()=>{
  show(contextPage);
  meetingLinkInput.style.display = "block";
  meetingLinkLabel.style.display = "block";
};

 representNo.onclick = async ()=>{

  await getMeetingUrl();

  const meetingId = extractMeetingId(meetingUrl);

  const names = await fetchNamesFromServer(meetingId);

  if(names.length > 0){

    // ✅ TAKE LATEST UNUSED NAME
    const selected = names[names.length - 1];

    chrome.storage.sync.set({
      representName: selected.name,
      meetingUrl: meetingUrl
    });

    show(rolePage);

  }else{
    alert("No available names for this meeting");
    show(representPage);
  }
};

// ---------- SAVE + UPLOAD ----------
saveContext.onclick = async ()=>{

  const name = repName.value.trim();
  const file = contextFile.files[0];
  let manualLink = meetingLinkInput.value.trim();

  if(manualLink && !isValidMeetingLink(manualLink)){
    alert("Enter valid meeting link");
    return;
  }

  if(!name || !file){
    alert("Provide name and context file");
    return;
  }

  const reader = new FileReader();

  reader.onload = async function(e){

    const text = e.target.result;

    await getMeetingUrl();

    let finalMeetingId = extractMeetingId(manualLink || meetingUrl);

    if(!finalMeetingId){
      alert("No meeting link found");
      return;
    }

    // 🔥 SWITCH TO UPLOAD PAGE
    show(uploadPage);
    uploadStatus.innerText = "Uploading...";
    uploadBar.style.width = "0%";

    try{

      // 🔥 START PROGRESS
      animateProgress(40);

      // 🔥 BACKEND CALL WITH VERIFICATION
      const response = await fetch("https://proxymeagent.onrender.com/upload-context",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({
          meeting_id: finalMeetingId,
          name: name,
          context: text
        })
      });

      const result = await response.json();

      if(!response.ok || result.status !== "uploaded"){
        throw new Error("Upload failed");
      }

      // 🔥 CONTINUE PROGRESS
      animateProgress(100);

      // 🔥 SAVE LOCALLY
      chrome.storage.sync.set({
        representing:true,
        representName:name,
        contextText:text,
        meetingUrl: manualLink || meetingUrl
      });

      // 🔥 SUCCESS TEXT
      setTimeout(()=>{
        uploadStatus.innerText = "Uploaded Successfully";
      },500);

    }catch(err){
      alert("Upload failed");
      show(contextPage);
    }
  };

  reader.readAsText(file);
};

// ---------- ROLE ----------
hostBtn.onclick = async ()=>{

  await getMeetingUrl();

  chrome.storage.sync.get(["representName","proxyEnabled"],(data)=>{

    nameDisplay.innerText = data.representName;

    chrome.storage.sync.set({
      role:"host",
      meetingUrl:meetingUrl
    });

    show(hostPage);
    updateToggleButton(data.proxyEnabled);
  });
};

attendeeBtn.onclick = async ()=>{

  await getMeetingUrl();

  chrome.storage.sync.get(["representName","proxyEnabled"],(data)=>{

    nameDisplayAtt.innerText = data.representName;

    chrome.storage.sync.set({
      role:"attendee",
      meetingUrl:meetingUrl
    });

    show(attendeePage);

    // ✅ ADD THIS
    updateToggleButton(data.proxyEnabled);
  });
};
// ---------- TOGGLE ----------

// ✅ shared update
function updateToggleButton(enabled){
  if(toggleBtn){
    toggleBtn.innerText = enabled
      ? "Turn OFF ProxyMe"
      : "Turn ON ProxyMe";
  }

  if(toggleBtnAtt){
    toggleBtnAtt.innerText = enabled
      ? "Turn OFF ProxyMe"
      : "Turn ON ProxyMe";
  }
}

// ✅ host toggle
if(toggleBtn){
  toggleBtn.onclick = ()=>{

    chrome.storage.sync.get(["proxyEnabled"],(data)=>{

      const newState = !data.proxyEnabled;

      chrome.storage.sync.set({
        proxyEnabled:newState
      });

      updateToggleButton(newState);
    });

  };
}

// ✅ attendee toggle
if(toggleBtnAtt){
  toggleBtnAtt.onclick = ()=>{

    chrome.storage.sync.get(["proxyEnabled"],(data)=>{

      const newState = !data.proxyEnabled;

      chrome.storage.sync.set({
        proxyEnabled:newState
      });

      updateToggleButton(newState);
    });

  };
}

chrome.runtime.onMessage.addListener((msg)=>{

  const activePage = document.querySelector(".page.active");

  let pill = null;

  if(activePage === hostPage){
    pill = listeningPill;
  }

  if(activePage === attendeePage){
    pill = listeningPillAtt;
  }

  // ✅ TRANSCRIPT
  if(msg.type === "transcript"){
    if(activePage === hostPage && transcriptBoxHost){
      transcriptBoxHost.innerText = msg.text;
    }

    if(activePage === attendeePage && transcriptBoxAtt){
      transcriptBoxAtt.innerText = msg.text;
    }
  }

  if(!pill) return;

  // ✅ STATES
  if(msg.type === "state_listening"){
    pill.innerText = "LISTENING 🎤";
    pill.classList.add("active");
    pill.classList.remove("inactive");
  }

  if(msg.type === "state_thinking"){
    pill.innerText = "THINKING...";
    pill.classList.add("active");
    pill.classList.remove("inactive");
  }

  if(msg.type === "state_speaking"){
    pill.innerText = "SPEAKING 🔊";
    pill.classList.add("active");
    pill.classList.remove("inactive");
  }

});
async function fetchNamesFromServer(meetingId){
  try{
    const res = await fetch("https://proxymeagent.onrender.com/get-representors");
    const data = await res.json();

    if(data.names && data.names.length > 0){

      // ✅ FILTER BY MEETING ID + UNUSED
      const filtered = data.names.filter(n =>
      (n.meeting_id || "").trim().toLowerCase() === meetingId.trim().toLowerCase()
  );

      return filtered;
    }
  }catch(err){
    console.error("Server fetch failed", err);
  }

  return [];
}
// ---------- INIT ----------
restoreState();