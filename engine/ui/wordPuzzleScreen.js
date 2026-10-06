const WordPuzzleScreen={
init(){
if(typeof EventManager==="undefined")return;
EventManager.on("activityReady",p=>{
if(p?.engineName==="WordPuzzleEngine")this.render(p.result);
});
},

render(s){
const root=document.getElementById("app");
if(!root)return;
root.innerHTML="";
const box=document.createElement("main");
box.className="wp-shell";
box.dir="rtl";
box.innerHTML=`
<section class="wp-header">
<div class="wp-progress">مرحله <strong>${s.round+1}</strong> از ${s.total}</div>
<div class="wp-score">⭐ ${s.score}</div>
</section>
<h1>${s.data?.title||"واژه‌خانه"}</h1>
<p class="wp-instruction">${s.data?.instruction||""}</p>
<div class="wp-status" aria-live="polite"></div>
<div id="wp"></div>`;
root.appendChild(box);

const x=box.querySelector("#wp");
if(s.data?.type==="wordBuilder")this.builder(x,s.data);
else if(s.data?.type==="wordSearch")this.search(x,s.data);
else if(s.data?.type==="wordFamily")this.family(x,s.data);
else this.lpath(x,s.data);
},

feedback(x,message,good){
const status=x.closest(".wp-shell")?.querySelector(".wp-status");
if(!status)return;
status.textContent=message;
status.className="wp-status "+(good?"good":"bad");
},

builder(x,d){
let selected=[];
x.innerHTML=`
<div class="wp-card">
<div class="wp-clue">${d.instruction}</div>
<div class="wp-answer" aria-live="polite">پاسخ شما</div>
<div class="wp-letters" role="group" aria-label="حروف واژه"></div>
<div class="wp-actions">
<button type="button" class="wp-btn wp-secondary" data-clear>پاک کردن</button>
<button type="button" class="wp-btn" data-check>بررسی</button>
</div>
</div>`;

const answer=x.querySelector(".wp-answer");
const q=x.querySelector(".wp-letters");

const update=()=>{
answer.textContent=selected.length?selected.map(i=>d.letters[i]).join(""):"پاسخ شما";
answer.classList.toggle("has-value",selected.length>0);
};

d.letters.forEach((letter,i)=>{
const b=document.createElement("button");
b.type="button";
b.textContent=letter;
b.className="wp-letter";
b.setAttribute("aria-label","حرف "+letter);
b.onclick=()=>{
if(selected.includes(i))return;
selected.push(i);
b.classList.add("sel");
update();
};
q.appendChild(b);
});

x.querySelector("[data-clear]").onclick=()=>{
selected=[];
q.querySelectorAll(".sel").forEach(b=>b.classList.remove("sel"));
update();
};

x.querySelector("[data-check]").onclick=()=>{
if(!selected.length){this.feedback(x,"ابتدا واژه را بساز.",false);return;}
WordPuzzleEngine.submitBuilder(selected.map(i=>d.letters[i]).join(""));
};
},

family(x,d){
let selected=new Set();
x.innerHTML=`
<div class="wp-card">
<div class="wp-family-base">واژه پایه <strong>${d.base}</strong></div>
<div class="wp-family-help">همه واژه‌های هم‌خانواده را انتخاب کن.</div>
<div class="wp-options"></div>
<button type="button" class="wp-btn" data-check>بررسی</button>
</div>`;
const options=x.querySelector(".wp-options");
d.options.forEach((word,i)=>{
const b=document.createElement("button");
b.type="button";
b.className="wp-option";
b.textContent=word;
b.onclick=()=>{
if(selected.has(i)){selected.delete(i);b.classList.remove("sel");}
else{selected.add(i);b.classList.add("sel");}
};
options.appendChild(b);
});
x.querySelector("[data-check]").onclick=()=>{
const values=[...selected].map(i=>d.options[i]);
WordPuzzleEngine.submitFamily(values);
};
},

search(x,d){
let path=[];
x.innerHTML=`
<div class="wp-card">
<div class="wp-target-list"></div>
<div class="wp-grid wp-search-grid"></div>
<div class="wp-selection">حروف انتخاب‌شده: <strong>—</strong></div>
<div class="wp-actions">
<button type="button" class="wp-btn wp-secondary" data-clear>پاک کردن مسیر</button>
<button type="button" class="wp-btn" data-check>ثبت واژه</button>
</div>
</div>`;
const list=x.querySelector(".wp-target-list");
list.innerHTML=d.words.map(w=>`<span>${w}</span>`).join("");
const grid=x.querySelector(".wp-grid");
const update=()=>{
const value=WordPuzzlePathEngine.read(d.grid,path);
x.querySelector(".wp-selection strong").textContent=value||"—";
};
d.grid.forEach((row,r)=>row.forEach((letter,c)=>{
const b=document.createElement("button");
b.type="button";
b.className="wp-cell";
b.textContent=letter;
b.setAttribute("aria-label",`ردیف ${r+1} ستون ${c+1}`);
b.onclick=()=>{
const key=r+","+c;
const idx=path.findIndex(p=>p[0]===r&&p[1]===c);
if(idx>=0){
path.splice(idx,1);
b.classList.remove("sel");
update();
return;
}
if(path.length){
const last=path[path.length-1];
if(Math.max(Math.abs(r-last[0]),Math.abs(c-last[1]))!==1){
this.feedback(x,"حرف بعدی باید کنار حرف قبلی باشد.",false);
return;
}
}
path.push([r,c]);
b.classList.add("sel");
update();
};
grid.appendChild(b);
}));
x.querySelector("[data-clear]").onclick=()=>{
path=[];
grid.querySelectorAll(".sel").forEach(b=>b.classList.remove("sel"));
update();
};
x.querySelector("[data-check]").onclick=()=>{
if(path.length<2){this.feedback(x,"یک واژه را کامل انتخاب کن.",false);return;}
WordPuzzleEngine.submitSearch(path);
};
},

lpath(x,d){
let path=[];
x.innerHTML=`
<div class="wp-card">
<div class="wp-lpath-word">واژه هدف: <strong>${d.word}</strong></div>
<div class="wp-grid wp-l-grid"></div>
<div class="wp-selection">مسیر انتخاب‌شده: <strong>—</strong></div>
<div class="wp-actions">
<button type="button" class="wp-btn wp-secondary" data-clear>پاک کردن</button>
<button type="button" class="wp-btn" data-check>بررسی مسیر</button>
</div>
</div>`;
const grid=x.querySelector(".wp-grid");
const update=()=>{
x.querySelector(".wp-selection strong").textContent=WordPuzzlePathEngine.read(d.grid,path)||"—";
};
d.grid.forEach((row,r)=>row.forEach((letter,c)=>{
const b=document.createElement("button");
b.type="button";
b.className="wp-cell";
b.textContent=letter;
b.onclick=()=>{
const key=r+","+c;
const idx=path.findIndex(p=>p[0]===r&&p[1]===c);
if(idx>=0){
path.splice(idx,1);
b.classList.remove("sel");
update();
return;
}
if(path.length){
const last=path[path.length-1];
if(Math.max(Math.abs(r-last[0]),Math.abs(c-last[1]))!==1){
this.feedback(x,"مسیر باید پیوسته باشد.",false);
return;
}
}
path.push([r,c]);
b.classList.add("sel");
update();
};
grid.appendChild(b);
}));
x.querySelector("[data-clear]").onclick=()=>{
path=[];
grid.querySelectorAll(".sel").forEach(b=>b.classList.remove("sel"));
update();
};
x.querySelector("[data-check]").onclick=()=>{
if(path.length<3){this.feedback(x,"مسیر L شکل را کامل انتخاب کن.",false);return;}
WordPuzzleEngine.submitL(path);
};
}
};
WordPuzzleScreen.init();