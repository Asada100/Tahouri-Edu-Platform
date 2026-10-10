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
<div class="wp-score">⭐ <strong>${s.score}</strong></div>
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

afterSubmit(x,result){
const good=!!result?.correct;
this.feedback(x,good?"آفرین! پاسخ درست بود.":"این پاسخ درست نبود؛ مرحله بعد را با دقت بیشتری حل کن.",good);
if(result?.finished){
    // The engine has already emitted activityFinished. ActivityLifecycle
    // owns result presentation and progress recording; do not replace the
    // platform result screen with a second, engine-specific finish screen.
    return;
}
setTimeout(()=>this.render(result.state),900);
},

hint(x,renderHint){
const result=WordPuzzleEngine.hint();
if(!result){
this.feedback(x,"راهنمای بیشتری در دسترس نیست.",false);
return;
}
if(result.type==="letter"){
renderHint(result.value);
this.feedback(x,"یک راهنما نمایش داده شد؛ امتیاز این مرحله کمی کاهش می‌یابد.",false);
}else if(result.type==="cell"){
renderHint(result.value,result.type);
this.feedback(x,"یک خانه از مسیر راهنما مشخص شد؛ حالا واژه را پیدا کن.",false);
}
},

finish(result){
const root=document.getElementById("app");
if(!root)return;
const percentage=result.percentage??Math.round((result.correctAnswers/result.totalQuestions)*100);
const stars=WordPuzzleScore.stars(percentage);
const box=document.createElement("main");
box.className="wp-shell wp-finish";
box.dir="rtl";
box.innerHTML=`
<div class="wp-finish-card">
<div class="wp-finish-icon">🎉</div>
<h1>واژه‌خانه را کامل کردی!</h1>
<p class="wp-finish-message">${result.message||"خسته نباشی!"}</p>
<div class="wp-stars" aria-label="${stars} ستاره از ۵">${"★".repeat(stars)}${"☆".repeat(5-stars)}</div>
<div class="wp-summary">
<div><span>امتیاز</span><strong>${result.score}</strong></div>
<div><span>پاسخ درست</span><strong>${result.correctAnswers} از ${result.totalQuestions}</strong></div>
<div><span>درصد موفقیت</span><strong>${percentage}٪</strong></div>
</div>
<button type="button" class="wp-btn" data-finish>بازگشت</button>
</div>`;
root.innerHTML="";
root.appendChild(box);
box.querySelector("[data-finish]").onclick=()=>{if(typeof NavigationHistory!=="undefined")NavigationHistory.back();if(typeof Screen!=="undefined"&&typeof Screen.showActivities==="function"&&typeof AppState!=="undefined"){Screen.showActivities(AppState.grade,AppState.subject,AppState.chapter);return;}if(typeof Screen!=="undefined"&&typeof Screen.showHome==="function")Screen.showHome();};
},

builder(x,d){
let selected=[];
x.innerHTML=`
<div class="wp-card">
<div class="wp-clue">${d.instruction}</div>
<div class="wp-hint" aria-live="polite"></div>
<div class="wp-answer" aria-live="polite">پاسخ شما</div>
<div class="wp-letters" role="group" aria-label="حروف واژه"></div>
<div class="wp-actions">
<button type="button" class="wp-btn wp-secondary" data-clear>پاک کردن</button>
<button type="button" class="wp-btn wp-hint-btn" data-hint>راهنما 💡</button>
<button type="button" class="wp-btn" data-check>بررسی</button>
</div>
</div>`;
const answer=x.querySelector(".wp-answer"),q=x.querySelector(".wp-letters"),hintBox=x.querySelector(".wp-hint");
const update=()=>{
answer.textContent=selected.length?selected.map(i=>d.letters[i]).join(""):"پاسخ شما";
answer.classList.toggle("has-value",selected.length>0);
};
d.letters.forEach((letter,i)=>{
const b=document.createElement("button");
b.type="button";b.textContent=letter;b.className="wp-letter";b.setAttribute("aria-label","حرف "+letter);
b.onclick=()=>{if(selected.includes(i))return;selected.push(i);b.classList.add("sel");update();};
q.appendChild(b);
});
x.querySelector("[data-clear]").onclick=()=>{selected=[];q.querySelectorAll(".sel").forEach(b=>b.classList.remove("sel"));update();};
x.querySelector("[data-hint]").onclick=()=>this.hint(x,v=>{hintBox.textContent="حرف راهنما: "+v;hintBox.classList.add("show");});
x.querySelector("[data-check]").onclick=()=>{
if(!selected.length){this.feedback(x,"ابتدا واژه را بساز.",false);return;}
this.afterSubmit(x,WordPuzzleEngine.submitBuilder(selected.map(i=>d.letters[i]).join("")));
};
},

family(x,d){
let selected=new Set();
x.innerHTML=`
<div class="wp-card">
<div class="wp-family-base">واژه پایه <strong>${d.base}</strong></div>
<div class="wp-family-help">${d.instruction}</div>
<div class="wp-hint" aria-live="polite"></div>
<div class="wp-options"></div>
<div class="wp-actions">
<button type="button" class="wp-btn wp-hint-btn" data-hint>راهنما 💡</button>
<button type="button" class="wp-btn" data-check>بررسی</button>
</div>
</div>`;
const options=x.querySelector(".wp-options"),hintBox=x.querySelector(".wp-hint");
d.options.forEach((word,i)=>{
const b=document.createElement("button");
b.type="button";b.className="wp-option";b.textContent=word;
b.onclick=()=>{if(selected.has(i)){selected.delete(i);b.classList.remove("sel");}else{selected.add(i);b.classList.add("sel");}};
options.appendChild(b);
});
x.querySelector("[data-hint]").onclick=()=>this.hint(x,v=>{hintBox.textContent="یکی از واژه‌های هم‌خانواده با «"+d.base+"» شروع می‌شود با: "+v;hintBox.classList.add("show");});
x.querySelector("[data-check]").onclick=()=>this.afterSubmit(x,WordPuzzleEngine.submitFamily([...selected].map(i=>d.options[i])));
},

search(x,d){
let path=[];
x.innerHTML=`
<div class="wp-card">
<div class="wp-target-list"></div>
<div class="wp-hint" aria-live="polite"></div>
<div class="wp-grid wp-search-grid"></div>
<div class="wp-selection">حروف انتخاب‌شده: <strong>—</strong></div>
<div class="wp-actions">
<button type="button" class="wp-btn wp-secondary" data-clear>پاک کردن مسیر</button>
<button type="button" class="wp-btn wp-hint-btn" data-hint>راهنما 💡</button>
<button type="button" class="wp-btn" data-check>ثبت واژه</button>
</div>
</div>`;
const list=x.querySelector(".wp-target-list"),grid=x.querySelector(".wp-grid"),hintBox=x.querySelector(".wp-hint");
list.innerHTML=d.words.map(w=>`<span>${w}</span>`).join("");
grid.style.gridTemplateColumns="repeat("+d.grid.length+",minmax(0,1fr))";
const update=()=>x.querySelector(".wp-selection strong").textContent=WordPuzzlePathEngine.read(d.grid,path)||"—";
d.grid.forEach((row,r)=>row.forEach((letter,c)=>{
const b=document.createElement("button");b.type="button";b.className="wp-cell";b.textContent=letter;
b.setAttribute("aria-label",`ردیف ${r+1} ستون ${c+1}`);
b.dataset.r=r;b.dataset.c=c;
b.onclick=()=>{
const idx=path.findIndex(p=>p[0]===r&&p[1]===c);
if(idx>=0){path.splice(idx,1);b.classList.remove("sel");update();return;}
if(path.length){const last=path[path.length-1];if(Math.max(Math.abs(r-last[0]),Math.abs(c-last[1]))!==1){this.feedback(x,"حرف بعدی باید کنار حرف قبلی باشد.",false);return;}}
path.push([r,c]);b.classList.add("sel");update();
};
grid.appendChild(b);
}));
x.querySelector("[data-clear]").onclick=()=>{path=[];grid.querySelectorAll(".sel").forEach(b=>b.classList.remove("sel"));update();};
x.querySelector("[data-hint]").onclick=()=>this.hint(x,(value,type)=>{if(type==="cell"){const cell=grid.querySelector('[data-r="'+value[0]+'"][data-c="'+value[1]+'"]');if(cell)cell.classList.add("hint-cell");hintBox.textContent="یک خانه از واژه مشخص شد.";}else{hintBox.textContent="حرف راهنما: "+value;}hintBox.classList.add("show");});
x.querySelector("[data-check]").onclick=()=>{
if(path.length<2){this.feedback(x,"یک واژه را کامل انتخاب کن.",false);return;}
this.afterSubmit(x,WordPuzzleEngine.submitSearch(path));
};
},

lpath(x,d){
let path=[];
x.innerHTML=`
<div class="wp-card">
<div class="wp-lpath-word">راهنما: <strong>${d.clue||"واژه را در مسیر L شکل پیدا کن."}</strong></div>
<div class="wp-hint" aria-live="polite"></div>
<div class="wp-grid wp-l-grid"></div>
<div class="wp-selection">مسیر انتخاب‌شده: <strong>—</strong></div>
<div class="wp-actions">
<button type="button" class="wp-btn wp-secondary" data-clear>پاک کردن</button>
<button type="button" class="wp-btn wp-hint-btn" data-hint>راهنما 💡</button>
<button type="button" class="wp-btn" data-check>بررسی مسیر</button>
</div>
</div>`;
const grid=x.querySelector(".wp-grid"),hintBox=x.querySelector(".wp-hint");
const update=()=>x.querySelector(".wp-selection strong").textContent=WordPuzzlePathEngine.read(d.grid,path)||"—";
d.grid.forEach((row,r)=>row.forEach((letter,c)=>{
const b=document.createElement("button");b.type="button";b.className="wp-cell";b.textContent=letter;
b.setAttribute("aria-label",`ردیف ${r+1} ستون ${c+1}`);
b.dataset.r=r;b.dataset.c=c;
b.onclick=()=>{
const idx=path.findIndex(p=>p[0]===r&&p[1]===c);
if(idx>=0){path.splice(idx,1);b.classList.remove("sel");update();return;}
if(path.length){const last=path[path.length-1];if(Math.max(Math.abs(r-last[0]),Math.abs(c-last[1]))!==1){this.feedback(x,"مسیر باید پیوسته باشد.",false);return;}}
path.push([r,c]);b.classList.add("sel");update();
};
grid.appendChild(b);
}));
x.querySelector("[data-clear]").onclick=()=>{path=[];grid.querySelectorAll(".sel").forEach(b=>b.classList.remove("sel"));update();};
x.querySelector("[data-hint]").onclick=()=>this.hint(x,(value,type)=>{if(type==="cell"){const cell=grid.querySelector('[data-r="'+value[0]+'"][data-c="'+value[1]+'"]');if(cell)cell.classList.add("hint-cell");hintBox.textContent="یک خانه از واژه مشخص شد.";}else{hintBox.textContent="حرف راهنما: "+value;}hintBox.classList.add("show");});
x.querySelector("[data-check]").onclick=()=>{
if(path.length<3){this.feedback(x,"مسیر L شکل را کامل انتخاب کن.",false);return;}
this.afterSubmit(x,WordPuzzleEngine.submitL(path));
};
}
};
WordPuzzleScreen.init();