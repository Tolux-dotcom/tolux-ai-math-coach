
let course = "Algebra 1";
let mode = "Tutor Mode";
let imageDataUrl = null;
const history = [];

const chat = document.querySelector("#chat");
const input = document.querySelector("#input");
const modeLabel = document.querySelector("#modeLabel");
const apiStatus = document.querySelector("#apiStatus");
const previewWrap = document.querySelector("#previewWrap");
const preview = document.querySelector("#preview");

document.querySelectorAll(".course").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".course").forEach(x=>x.classList.remove("selected"));
  btn.classList.add("selected");
  course = btn.dataset.course;
  refreshLabel();
}));

document.querySelectorAll(".mode").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".mode").forEach(x=>x.classList.remove("selected"));
  btn.classList.add("selected");
  mode = btn.dataset.mode;
  refreshLabel();
}));

function refreshLabel(){ modeLabel.textContent = `${course} • ${mode}`; }

function addMessage(role, text, error=false){
  const el = document.createElement("div");
  el.className = `message ${role}${error ? " error" : ""}`;
  const who = role === "assistant" ? "Tolux Coach" : "You";
  el.innerHTML = `<strong>${who}</strong><p></p>`;
  el.querySelector("p").textContent = text;
  chat.appendChild(el);
  if (window.MathJax?.typesetPromise) {
  window.MathJax.typesetPromise([el]).catch(console.error);
}
  chat.scrollTop = chat.scrollHeight;
  if(!error) history.push({role, text});
}

function demoReply(text){
  const t = text.toLowerCase();
  if(t.includes("stuck") || t.includes("hint")) return "Hint: Look at the operation closest to the variable. What inverse operation would undo it? Try only that step first.";
  if(t.includes("another way")) return "Another way: think of an equation like a balanced scale. Whatever you do to one side, you must do to the other so the scale stays balanced.";
  if(t.includes("similar problem")) return "Try this similar problem: 4x + 7 = 31. Solve it one step at a time, and send me your first step.";
  const match = text.match(/(-?\d+)\s*x\s*([+-]\s*\d+)?\s*=\s*(-?\d+)/i);
  if(match){
    const a = Number(match[1]), b = match[2] ? Number(match[2].replace(/\s/g,"")) : 0, c = Number(match[3]);
    const x = (c-b)/a;
    return `Goal: isolate x.\n\nStart with: ${a}x ${b>=0?"+ ":"- "}${Math.abs(b)} = ${c}\n\nStep 1: ${b>=0?"Subtract":"Add"} ${Math.abs(b)} on both sides.\n${a}x = ${c-b}\n\nStep 2: Divide both sides by ${a}.\nx = ${x}\n\nCheck: ${a}(${x}) ${b>=0?"+ ":"- "}${Math.abs(b)} = ${c}.\n\nNow try explaining why Step 1 keeps the equation balanced.`;
  }
  return `Demo Mode is active. I can already demonstrate simple linear-equation tutoring. For full ${course} tutoring, connect the OpenAI API key as described in the README.\n\nYour selected mode is ${mode}.`;
}

async function askCoach(text){
  addMessage("user", text || (imageDataUrl ? "[Uploaded a math problem image]" : ""));
  input.value = "";
  const payload = { message:text, course, mode, imageDataUrl, history: history.slice(0,-1) };
  const priorImage = imageDataUrl;
  clearImage();
  const thinking = document.createElement("div");
  thinking.className = "message assistant";
  thinking.innerHTML = "<strong>Tolux Coach</strong><p>Working through it step by step…</p>";
  chat.appendChild(thinking); chat.scrollTop=chat.scrollHeight;

  try{
    const r = await fetch("/api/coach",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data = await r.json();
    thinking.remove();
    if(r.ok && data.reply){
      apiStatus.textContent = "AI Live";
      apiStatus.className = "badge live";
      addMessage("assistant", data.reply);
    }else{
      apiStatus.textContent = "Demo Mode";
      apiStatus.className = "badge demo";
      addMessage("assistant", priorImage ? "I can preview your image, but image analysis requires the API key. " + demoReply(text) : demoReply(text));
    }
  }catch(e){
    thinking.remove();
    apiStatus.textContent = "Demo Mode";
    apiStatus.className = "badge demo";
    addMessage("assistant", demoReply(text));
  }
}

document.querySelector("#composer").addEventListener("submit", e=>{
  e.preventDefault();
  const text=input.value.trim();
  if(!text && !imageDataUrl) return;
  askCoach(text);
});
document.querySelectorAll("[data-quick]").forEach(b=>b.addEventListener("click",()=>askCoach(b.dataset.quick)));

document.querySelector("#imageInput").addEventListener("change", e=>{
  const file=e.target.files?.[0];
  if(!file) return;
  if(file.size > 6_000_000){ alert("Please use an image under 6 MB for this prototype."); return; }
  const reader=new FileReader();
  reader.onload=()=>{
    imageDataUrl=reader.result;
    preview.src=imageDataUrl;
    previewWrap.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
});
document.querySelector("#removeImage").addEventListener("click", clearImage);
function clearImage(){
  imageDataUrl=null;
  preview.src="";
  previewWrap.classList.add("hidden");
  document.querySelector("#imageInput").value="";
}

apiStatus.textContent = "Demo / AI Ready";
apiStatus.className = "badge demo";
