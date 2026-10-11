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
if(s.data?.type==="modeSelect"){
box.innerHTML=`<h1>واژه‌خانه 🧩</h1><p class="wp-instruction">نوع بازی را انتخاب کن. هر بار فقط همین بازی اجرا می‌شود.</p><div id="wp"></div>`;
root.appendChild(box);
this.modeSelect(box.querySelector("#wp"),s.data);
return;
}
box.innerHTML=`
<section class="wp-header">
<div class="wp-progress">${s.data?.type==="wordSearch"?"واژه‌های پیدا‌شده": "بازی مستقل"} <strong>${s.data?.type==="wordSearch"?s.foundWords.length+" از "+s.total:""}</strong></div>
<div class="wp-score">⭐ <strong>${s.score}</strong></div>
</section>
<h1>${s.data?.title||"واژه‌خانه"}</h1>
<p class="wp-instruction">${s.data?.instruction||""}</p>
<div class="wp-status" aria-live="polite"></div>
<div id="wp"></div>`;
root.appendChild(box);
const x=box.querySelector("#wp");
if(s.data?.type==="wordBuilder")this.builder(x,s.data);
else if(s.data?.type==="wordSearch")this.search(x,s.data,s.foundWords||[]);
else if(s.data?.type==="wordFamily")this.family(x,s.data);
else this.lpath(x,s.data);
},

modeSelect(x,d){
const labels={wordBuilder:["🔤","کلمه‌ساز","حروف را با کشیدن مسیر به هم وصل کن."],wordSearch:["🔎","واژه‌یاب","همه واژه‌های پنهان جدول را پیدا کن."],wordFamily:["🌱","خانواده واژه‌ها","واژه‌های هم‌خانواده را انتخاب کن."],lPath:["↪️","مسیر L","واژه را در مسیر L شکل پیدا کن."]};
x.innerHTML='<div class="wp-mode-list"></div>';
const list=x.querySelector(".wp-mode-list");
(d.modes||Object.keys(labels)).forEach(mode=>{
const item=labels[mode];if(!item)return;
const b=document.createElement("button");b.type="button";b.className="wp-mode-card";
b.innerHTML='<span class="wp-mode-icon">'+item[0]+'</span><strong>'+item[1]+'</strong><span>'+item[2]+'</span>';
b.onclick=()=>WordPuzzleEngine.selectMode(mode);
list.appendChild(b);
});
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
renderHint(result.value,result.type);
this.feedback(x,"یک راهنما نمایش داده شد؛ امتیاز این مرحله کمی کاهش می‌یابد.",false);
}else if(result.type==="cell"){
renderHint(result.value,result.type);
this.feedback(x,"خانه‌ای از مسیر راهنما مشخص شد؛ حالا واژه را پیدا کن.",false);
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

createGrid(gridElement,gridData){
gridElement.innerHTML="";
gridElement.style.gridTemplateColumns="repeat("+gridData[0].length+",minmax(0,1fr))";
gridData.forEach((row,r)=>row.forEach((letter,c)=>{
const b=document.createElement("button");
b.type="button";
b.className="wp-cell";
b.textContent=letter;
b.setAttribute("aria-label",`ردیف ${r+1} ستون ${c+1}، حرف ${letter}`);
b.dataset.r=r;b.dataset.c=c;
gridElement.appendChild(b);
}));
},

bindDragPath(gridElement,onUpdate){
let path=[];
let dragging=false;
const cells=()=>Array.from(gridElement.querySelectorAll(".wp-cell"));
const sync=()=>{
const selected=new Set(path.map(([r,c])=>r+","+c));
cells().forEach(cell=>cell.classList.toggle("sel",selected.has(cell.dataset.r+","+cell.dataset.c)));
onUpdate(path.map(p=>[p[0],p[1]]));
};
const visit=cell=>{
if(!cell||!gridElement.contains(cell))return;
const point=[Number(cell.dataset.r),Number(cell.dataset.c)];
const existing=path.findIndex(p=>p[0]===point[0]&&p[1]===point[1]);
if(existing>=0){
if(existing===path.length-1)return;
path=path.slice(0,existing+1);sync();return;
}
if(path.length){
const last=path[path.length-1];
if(Math.max(Math.abs(point[0]-last[0]),Math.abs(point[1]-last[1]))!==1)return;
}
path.push(point);sync();
};
gridElement.addEventListener("pointerdown",event=>{
const cell=event.target.closest?.(".wp-cell");
if(!cell)return;
event.preventDefault();
dragging=true;
try{gridElement.setPointerCapture(event.pointerId);}catch(_){}
visit(cell);
});
gridElement.addEventListener("pointermove",event=>{
if(!dragging)return;
const cell=document.elementFromPoint(event.clientX,event.clientY)?.closest?.(".wp-cell");
if(cell&&gridElement.contains(cell))visit(cell);
});
const stop=event=>{
dragging=false;
try{if(gridElement.hasPointerCapture(event.pointerId))gridElement.releasePointerCapture(event.pointerId);}catch(_){}
};
gridElement.addEventListener("pointerup",stop);
gridElement.addEventListener("pointercancel",stop);
gridElement.addEventListener("click",event=>{
if(event.detail!==0)return;
const cell=event.target.closest?.(".wp-cell");
if(cell)visit(cell);
});
return{
getPath:()=>path.map(p=>[p[0],p[1]]),
clear:()=>{path=[];cells().forEach(cell=>cell.classList.remove("hint-cell"));sync();},
highlight:point=>{
if(!Array.isArray(point)||point.length!==2)return;
const cell=gridElement.querySelector('[data-r="'+point[0]+'"][data-c="'+point[1]+'"]');
if(cell)cell.classList.add("hint-cell");
}
};
},

builder(x,d){
x.innerHTML=`
<div class="wp-card">
<div class="wp-clue">${d.instruction}</div>
<div class="wp-hint" aria-live="polite"></div>
<div class="wp-answer" aria-live="polite">حروف را با کشیدن انگشت یا موس به هم وصل کن</div>
<div class="wp-grid wp-builder-grid"></div>
<div class="wp-actions">
<button type="button" class="wp-btn wp-secondary" data-clear>پاک کردن مسیر</button>
<button type="button" class="wp-btn wp-hint-btn" data-hint>راهنما 💡</button>
<button type="button" class="wp-btn" data-check>بررسی واژه</button>
</div>
</div>`;
const answer=x.querySelector(".wp-answer"),grid=x.querySelector(".wp-builder-grid"),hintBox=x.querySelector(".wp-hint");
this.createGrid(grid,d.grid);
const path=this.bindDragPath(grid,selected=>{
const value=WordPuzzlePathEngine.read(d.grid,selected);
answer.textContent=value||"حروف را با کشیدن انگشت یا موس به هم وصل کن";
answer.classList.toggle("has-value",selected.length>0);
});
x.querySelector("[data-clear]").onclick=()=>{path.clear();answer.textContent="حروف را با کشیدن انگشت یا موس به هم وصل کن";answer.classList.remove("has-value");};
x.querySelector("[data-hint]").onclick=()=>this.hint(x,(value,type)=>{
if(type==="cell"){path.highlight(value);hintBox.textContent="از خانه مشخص‌شده شروع کن."; }
else hintBox.textContent="حرف راهنما: "+value;
hintBox.classList.add("show");
});
x.querySelector("[data-check]").onclick=()=>{
const selected=path.getPath();
if(selected.length<2){this.feedback(x,"برای ساخت واژه، حروف را با یک مسیر پیوسته وصل کن.",false);return;}
this.afterSubmit(x,WordPuzzleEngine.submitBuilder(WordPuzzlePathEngine.read(d.grid,selected)));
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
x.querySelector("[data-hint]").onclick=()=>this.hint(x,v=>{hintBox.textContent="یکی از واژه‌های هم‌خانواده با «"+d.base+"» با این حرف آغاز می‌شود: "+v;hintBox.classList.add("show");});
x.querySelector("[data-check]").onclick=()=>this.afterSubmit(x,WordPuzzleEngine.submitFamily([...selected].map(i=>d.options[i])));
},

search(x,d,foundWords=[]){
const normalize=w=>WordPuzzleRepository.normalize(w);
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
const paintWords=()=>{list.innerHTML="";d.words.forEach(w=>{const span=document.createElement("span");span.textContent=foundWords.includes(normalize(w))?"✓ "+w:w;span.classList.toggle("wp-found",foundWords.includes(normalize(w)));list.appendChild(span);});};
paintWords();
this.createGrid(grid,d.grid);
const path=this.bindDragPath(grid,selected=>{
x.querySelector(".wp-selection strong").textContent=WordPuzzlePathEngine.read(d.grid,selected)||"—";
});
x.querySelector("[data-clear]").onclick=()=>{path.clear();x.querySelector(".wp-selection strong").textContent="—";};
x.querySelector("[data-hint]").onclick=()=>this.hint(x,(value,type)=>{
if(type==="cell"){path.highlight(value);hintBox.textContent="یک خانه از واژه مشخص شد.";}
else hintBox.textContent="حرف راهنما: "+value;
hintBox.classList.add("show");
});
x.querySelector("[data-check]").onclick=()=>{
const selected=path.getPath();
if(selected.length<2){this.feedback(x,"یک واژه را با کشیدن مسیر روی جدول انتخاب کن.",false);return;}
const result=WordPuzzleEngine.submitSearch(selected);
if(result.correct&&result.foundWord){
foundWords=result.state?.foundWords||WordPuzzleEngine.state.foundWords;
paintWords();
this.feedback(x,"آفرین! «"+result.foundWord+"» پیدا شد. واژه‌های باقی‌مانده را هم پیدا کن.",true);
path.clear();x.querySelector(".wp-selection strong").textContent="—";
if(result.finished)return;
return;
}
if(result.duplicate)this.feedback(x,"این واژه را قبلاً پیدا کرده‌ای؛ واژه دیگری را امتحان کن.",false);
else this.feedback(x,"این مسیر واژهٔ تازه‌ای از فهرست نیست؛ دوباره تلاش کن.",false);
path.clear();x.querySelector(".wp-selection strong").textContent="—";
};
},

lpath(x,d){
x.innerHTML=`
<div class="wp-card">
<div class="wp-lpath-word">راهنما: <strong>${d.clue||"واژه را در مسیر L شکل پیدا کن."}</strong></div>
<div class="wp-hint" aria-live="polite"></div>
<div class="wp-grid wp-l-grid"></div>
<div class="wp-selection">مسیر انتخاب‌شده: <strong>—</strong></div>
<div class="wp-actions">
<button type="button" class="wp-btn wp-secondary" data-clear>پاک کردن مسیر</button>
<button type="button" class="wp-btn wp-hint-btn" data-hint>راهنما 💡</button>
<button type="button" class="wp-btn" data-check>بررسی مسیر</button>
</div>
</div>`;
const grid=x.querySelector(".wp-grid"),hintBox=x.querySelector(".wp-hint");
this.createGrid(grid,d.grid);
const path=this.bindDragPath(grid,selected=>{
x.querySelector(".wp-selection strong").textContent=WordPuzzlePathEngine.read(d.grid,selected)||"—";
});
x.querySelector("[data-clear]").onclick=()=>{path.clear();x.querySelector(".wp-selection strong").textContent="—";};
x.querySelector("[data-hint]").onclick=()=>this.hint(x,(value,type)=>{
if(type==="cell"){path.highlight(value);hintBox.textContent="از خانه مشخص‌شده شروع کن.";}
else hintBox.textContent="حرف راهنما: "+value;
hintBox.classList.add("show");
});
x.querySelector("[data-check]").onclick=()=>{
const selected=path.getPath();
if(selected.length<3){this.feedback(x,"مسیر L شکل را با کشیدن انگشت یا موس کامل کن.",false);return;}
this.afterSubmit(x,WordPuzzleEngine.submitL(selected));
};
}
};
WordPuzzleScreen.init();