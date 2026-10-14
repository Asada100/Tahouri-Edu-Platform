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
${s.data?.type==="wordSearch"?"":`<section class="wp-header">
<div class="wp-progress">بازی مستقل</div>
<div class="wp-score">⭐ <strong>${s.score}</strong></div>
</section>`}
<h1>${s.data?.title||"واژه‌خانه"}</h1>
${s.data?.type==="wordSearch"?`<div class="wp-instruction wp-instruction-with-hint"><span>واژه‌های پنهان را با کشیدن انگشت یا موس پیدا کن؛ مسیر می‌تواند مستقیم، مورب یا دارای یک پیچ L باشد.</span><button type="button" class="wp-btn wp-hint-btn wp-search-hint" aria-label="راهنما" title="راهنما">💡</button></div>`:`<p class="wp-instruction">${s.data?.instruction||""}</p>`}
<div class="wp-status" aria-live="polite"></div>
<div id="wp"></div>`;
root.appendChild(box);
const x=box.querySelector("#wp");
if(s.data?.type==="wordBuilder")this.builder(x,s.data);
else if(s.data?.type==="wordSearch")this.search(x,s.data,s.foundWords||[]);
else if(s.data?.type==="wordFamily")this.family(x,s.data);
else this.search(x,s.data,s.foundWords||[]);
},

modeSelect(x,d){
const labels={wordBuilder:["🔤","کلمه‌ساز","حروف را با کشیدن مسیر به هم وصل کن."],wordSearch:["🔎","واژه‌یاب","همه واژه‌های پنهان جدول را پیدا کن."],wordFamily:["🌱","خانواده واژه‌ها","واژه‌های هم‌خانواده را انتخاب کن."],lPath:["↪️","مسیر L","واژه را در مسیر L شکل پیدا کن."]};
x.innerHTML='<div class="wp-mode-list"></div>';
const list=x.querySelector(".wp-mode-list");
(d.modes||Object.keys(labels)).filter(mode=>mode!=="lPath").forEach(mode=>{
const item=labels[mode];if(!item)return;
const b=document.createElement("button");b.type="button";b.className="wp-mode-card";
b.innerHTML='<span class="wp-mode-icon">'+item[0]+'</span><strong>'+item[1]+'</strong><span>'+item[2]+'</span>';
b.onclick=()=>WordPuzzleEngine.selectMode(mode);
list.appendChild(b);
});
},

showToast(message,good=false){
const previous=document.getElementById("wp-feedback-toast");
if(previous)previous.remove();
const toast=document.createElement("div");
toast.id="wp-feedback-toast";
toast.className="wp-feedback-toast "+(good?"good":"bad");
toast.setAttribute("role","status");
toast.setAttribute("aria-live","polite");
toast.dir="rtl";
toast.textContent=message;
document.body.appendChild(toast);
toast.addEventListener("animationend",()=>toast.remove(),{once:true});
},
feedback(x,message,good){
this.showToast(message,good);
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

bindDragPath(gridElement,onUpdate,options={}){
let path=[];
let dragging=false;
const straightOnly=!!options.straightOnly;
const cells=()=>Array.from(gridElement.querySelectorAll(".wp-cell"));
gridElement.style.position="relative";
const svgNS="http://www.w3.org/2000/svg";
let overlay=gridElement.querySelector(".wp-path-overlay");
if(!overlay){
overlay=document.createElementNS(svgNS,"svg");
overlay.setAttribute("viewBox","0 0 1000 1000");
overlay.setAttribute("preserveAspectRatio","none");
overlay.setAttribute("aria-hidden","true");
overlay.classList.add("wp-path-overlay");
gridElement.appendChild(overlay);
}
const foundPaths=gridElement.__wpFoundPaths||(Array.isArray(options.foundPaths)?options.foundPaths.map(points=>points.map(p=>[p[0],p[1]])):[]);
gridElement.__wpFoundPaths=foundPaths;
const pointsFor=points=>points.map(([r,c])=>{
const cell=gridElement.querySelector('[data-r="'+r+'"][data-c="'+c+'"]');
return cell?((cell.offsetLeft+cell.offsetWidth/2)/Math.max(1,gridElement.clientWidth)*1000)+","+((cell.offsetTop+cell.offsetHeight/2)/Math.max(1,gridElement.clientHeight)*1000):null;
}).filter(Boolean).join(" ");
const drawOverlay=()=>{
overlay.innerHTML="";
foundPaths.forEach(points=>{
const line=document.createElementNS(svgNS,"polyline");
line.setAttribute("points",pointsFor(points));line.setAttribute("class","wp-path-line wp-path-found");
overlay.appendChild(line);
});
if(path.length>1){
const line=document.createElementNS(svgNS,"polyline");
line.setAttribute("points",pointsFor(path));line.setAttribute("class","wp-path-line wp-path-active");
overlay.appendChild(line);
}
};
const sync=()=>{
const selected=new Set(path.map(([r,c])=>r+","+c));
cells().forEach(cell=>cell.classList.toggle("sel",selected.has(cell.dataset.r+","+cell.dataset.c)));
drawOverlay();
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
const last=path[path.length-1],dr=point[0]-last[0],dc=point[1]-last[1];
if(Math.max(Math.abs(dr),Math.abs(dc))!==1)return;
if(straightOnly&&path.length>=2){
const baseR=path[1][0]-path[0][0],baseC=path[1][1]-path[0][1];
if(dr!==baseR||dc!==baseC)return;
}
}
path.push(point);sync();
};
const stop=event=>{
if(!dragging)return;
dragging=false;
try{if(gridElement.hasPointerCapture(event.pointerId))gridElement.releasePointerCapture(event.pointerId);}catch(_){}
if(typeof options.onRelease==="function")options.onRelease(path.map(p=>[p[0],p[1]]));
};
gridElement.addEventListener("pointerdown",event=>{
const cell=event.target.closest?.(".wp-cell");
if(!cell)return;
event.preventDefault();
if(typeof options.onStart==="function")options.onStart();
dragging=true;
try{gridElement.setPointerCapture(event.pointerId);}catch(_){}
visit(cell);
});
gridElement.addEventListener("pointermove",event=>{
if(!dragging)return;
const cell=document.elementFromPoint(event.clientX,event.clientY)?.closest?.(".wp-cell");
if(!cell||!gridElement.contains(cell))return;
const target=[Number(cell.dataset.r),Number(cell.dataset.c)];
const last=path[path.length-1];
if(!last){visit(cell);return;}
const dr=target[0]-last[0],dc=target[1]-last[1];
if(dr===0&&dc===0)return;
const steps=Math.max(Math.abs(dr),Math.abs(dc));
if(steps<=1){visit(cell);return;}
if(!(dr===0||dc===0||Math.abs(dr)===Math.abs(dc)))return;
const stepR=dr===0?0:dr/steps,stepC=dc===0?0:dc/steps;
if(straightOnly&&path.length>=2){
const baseR=path[1][0]-path[0][0],baseC=path[1][1]-path[0][1];
if(stepR!==baseR||stepC!==baseC)return;
}
for(let i=1;i<=steps;i++){
const next=gridElement.querySelector('[data-r="'+(last[0]+stepR*i)+'"][data-c="'+(last[1]+stepC*i)+'"]');
if(next)visit(next);
}
});
gridElement.addEventListener("pointerup",stop);
gridElement.addEventListener("pointercancel",stop);
gridElement.addEventListener("click",event=>{
if(event.detail!==0)return;
const cell=event.target.closest?.(".wp-cell");
if(cell)visit(cell);
});
return{
getPath:()=>path.map(p=>[p[0],p[1]]),
clear:()=>{path=[];cells().forEach(cell=>cell.classList.remove("hint-cell","sel","wp-error-cell"));drawOverlay();onUpdate([]);},
highlight:points=>{
cells().forEach(cell=>cell.classList.remove("hint-cell"));
const list=Array.isArray(points?.[0])?points:[points];
list.forEach(point=>{
if(!Array.isArray(point)||point.length!==2)return;
const cell=gridElement.querySelector('[data-r="'+point[0]+'"][data-c="'+point[1]+'"]');
if(cell)cell.classList.add("hint-cell");
});
},
markFound:()=>{
if(path.length>1)foundPaths.push(path.map(p=>[p[0],p[1]]));
path.forEach(([r,c])=>{
const cell=gridElement.querySelector('[data-r="'+r+'"][data-c="'+c+'"]');
if(cell){cell.classList.remove("sel","hint-cell");cell.classList.add("wp-found-cell");}
});
path=[];drawOverlay();onUpdate([]);
},
showError:()=>{
path.forEach(([r,c])=>{
const cell=gridElement.querySelector('[data-r="'+r+'"][data-c="'+c+'"]');
if(cell)cell.classList.add("wp-error-cell");
});
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
if(type==="cell"){path.highlight(value);this.showToast("از خانه مشخص‌شده شروع کن.",false);}
else this.showToast("حرف راهنما: "+value,false);
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
x.querySelector("[data-hint]").onclick=()=>this.hint(x,v=>{this.showToast("یکی از واژه‌های هم‌خانواده با «"+d.base+"» با این حرف آغاز می‌شود: "+v,false);});
x.querySelector("[data-check]").onclick=()=>this.afterSubmit(x,WordPuzzleEngine.submitFamily([...selected].map(i=>d.options[i])));
},

search(x,d,foundWords=[]){
const normalize=w=>WordPuzzleRepository.normalize(w);
let feedbackTimer=null,hintTimer=null,resultShowing=false;
x.innerHTML=`
<div class="wp-card wp-search-card">
<div class="wp-target-list"></div>
<div class="wp-hint" aria-live="polite"></div>
<div class="wp-selection wp-live-word" aria-live="polite" role="status"><strong>—</strong></div>
<div class="wp-grid wp-search-grid"></div>
</div>`;
const list=x.querySelector(".wp-target-list"),grid=x.querySelector(".wp-grid"),hintBox=x.querySelector(".wp-hint");
const selection=x.querySelector(".wp-selection strong");
const liveWord=selection.parentElement;
const clearFeedback=()=>{
if(feedbackTimer){clearTimeout(feedbackTimer);feedbackTimer=null;}
if(hintTimer){clearTimeout(hintTimer);hintTimer=null;}
resultShowing=false;
selection.textContent="—";
liveWord.classList.remove("good","bad","visible");
hintBox.classList.remove("show");list.querySelectorAll(".wp-hint-target").forEach(span=>span.classList.remove("wp-hint-target"));
};
const paintWords=()=>{
list.innerHTML="";
d.words.forEach(w=>{
const span=document.createElement("span");
span.textContent=foundWords.includes(normalize(w))?"✓ "+WordPuzzleRepository.formatDisplay(w):WordPuzzleRepository.formatDisplay(w);
span.classList.toggle("wp-found",foundWords.includes(normalize(w)));
list.appendChild(span);
});
};
const updateProgress=()=>{
const progress=x.closest(".wp-shell")?.querySelector(".wp-progress strong");
if(progress)progress.textContent=foundWords.length+" از "+WordPuzzleEngine.state.total;
const score=x.closest(".wp-shell")?.querySelector(".wp-score strong");
if(score)score.textContent=Math.max(0,WordPuzzleEngine.state.score-(WordPuzzleEngine.state.hintPenalty||0));
};
paintWords();
this.createGrid(grid,d.grid);
// createGrid clears the grid contents, so attach the hint overlay after it renders.
grid.after(hintBox);
const path=this.bindDragPath(grid,selected=>{
if(selected.length){
const raw=WordPuzzlePathEngine.read(d.grid,selected)||"—";
// Show only the letters the learner selected; do not reveal a target word mid-drag.
selection.textContent=raw;
liveWord.classList.add("visible");
if(!resultShowing)liveWord.classList.remove("good","bad");
}else if(!resultShowing){selection.textContent="—";liveWord.classList.remove("visible");}
},{straightOnly:false,
foundPaths:(d.placements||[]).filter(item=>foundWords.includes(normalize(item.word))).map(item=>item.path).filter(Array.isArray),
onStart:()=>{clearFeedback();if(path)path.clear();},
onRelease:selected=>{
if(selected.length<2){if(path)path.clear();return;}
const result=WordPuzzleEngine.submitSearch(selected);
if(result.correct&&result.foundWord){
foundWords=WordPuzzleEngine.state.foundWords.slice();
path.markFound();
resultShowing=true;
selection.textContent="آفرین! «"+WordPuzzleRepository.formatDisplay(result.foundWord)+"» پیدا شد.";
liveWord.classList.add("visible","good");
liveWord.classList.remove("bad");
paintWords();updateProgress();
feedbackTimer=setTimeout(()=>{resultShowing=false;selection.textContent="—";liveWord.classList.remove("visible","good","bad");feedbackTimer=null;},1800);
return;
}
resultShowing=true;
selection.textContent=result.duplicate?"این واژه قبلاً پیدا شده است.":"این واژه در فهرست نیست.";
liveWord.classList.add("visible","bad");
liveWord.classList.remove("good");
path.showError();
feedbackTimer=setTimeout(()=>{resultShowing=false;path.clear();selection.textContent="—";liveWord.classList.remove("visible","good","bad");feedbackTimer=null;},1800);
}
});
const hintButton=x.closest(".wp-shell")?.querySelector(".wp-search-hint");
hintButton.onclick=()=>{
clearFeedback();
const result=WordPuzzleEngine.hint();
if(!result){this.showToast("همه واژه‌ها پیدا شده‌اند.",true);return;}
if(result.type==="limit"){
this.showToast("برای این واژه، دو بخش از مسیر راهنما نمایش داده شده‌اند. واژه بعدی را پیدا کن.",false);
return;
}
if(result.type==="path"){
path.highlight(result.value);
// Keep the hint neutral: highlight path cells only, never the matching target label.
this.showToast("راهنما: خانه‌های روشن‌شده بخشی از مسیر یک واژه را نشان می‌دهند. ۲ امتیاز کسر شد.",false);
updateProgress();
}else if(result.type==="cell"){
path.highlight(result.value);
this.showToast("از خانه مشخص‌شده شروع کن.",false);
}
};
},

lpath(x,d){
x.innerHTML=`
<div class="wp-card wp-lpath-card">
<div class="wp-lpath-word">راهنما: <strong>${d.clue||"واژه را در مسیر L شکل پیدا کن."}</strong></div>
<div class="wp-grid wp-l-grid"></div>
<div class="wp-hint" aria-live="polite"></div>
<div class="wp-selection wp-live-word" aria-live="polite" role="status">مسیر انتخاب‌شده: <strong>—</strong></div>
<div class="wp-actions">
<button type="button" class="wp-btn wp-secondary" data-clear>پاک کردن مسیر</button>
<button type="button" class="wp-btn wp-hint-btn" data-hint>راهنما 💡</button>
<button type="button" class="wp-btn" data-check>بررسی مسیر</button>
</div>
</div>`;
const grid=x.querySelector(".wp-grid"),hintBox=x.querySelector(".wp-hint");
const liveWord=x.querySelector(".wp-selection"),selection=liveWord.querySelector("strong");
this.createGrid(grid,d.grid);
grid.after(hintBox);
const path=this.bindDragPath(grid,selected=>{
selection.textContent=WordPuzzlePathEngine.read(d.grid,selected)||"—";
liveWord.classList.remove("good","bad");
},{onStart:()=>{
path.clear();
selection.textContent="—";
hintBox.classList.remove("show");
liveWord.classList.remove("good","bad");
},onRelease:selected=>{
if(selected.length<3){if(selected.length) this.feedback(x,"مسیر را با کشیدن انگشت یا موس کامل کن.",false);return;}
if(!WordPuzzlePathEngine.isL(selected)){
liveWord.classList.add("bad");
this.feedback(x,"این مسیر هنوز شکل L ندارد؛ فقط یک بار جهت حرکت را عوض کن.",false);
path.showError();
return;
}
const value=WordPuzzlePathEngine.read(d.grid,selected);
const normalize=w=>WordPuzzleRepository.normalize(w);
if(normalize(value)!==normalize(d.word)&&normalize([...value].reverse().join(""))!==normalize(d.word)){
liveWord.classList.add("bad");
this.feedback(x,"این مسیر L شکل است، اما واژهٔ هدف را نمی‌سازد. دوباره تلاش کن.",false);
path.showError();
return;
}
liveWord.classList.add("good");
this.afterSubmit(x,WordPuzzleEngine.submitL(selected));
}});
x.querySelector("[data-clear]").onclick=()=>{
path.clear();selection.textContent="—";liveWord.classList.remove("good","bad");hintBox.classList.remove("show");
};
x.querySelector("[data-hint]").onclick=()=>this.hint(x,(value,type)=>{
if(type==="cell"){path.highlight(value);this.showToast("راهنما: از خانهٔ روشن‌شده شروع کن و واژه را با یک پیچ ۹۰ درجه‌ای به شکل L کامل کن.",false);}
else this.showToast("حرف راهنما: "+value,false);
});
x.querySelector("[data-check]").onclick=()=>{
const selected=path.getPath();
if(selected.length<3){this.feedback(x,"مسیر L شکل را با کشیدن انگشت یا موس کامل کن.",false);return;}
if(!WordPuzzlePathEngine.isL(selected)){this.feedback(x,"مسیر باید دقیقاً یک پیچ داشته باشد و شکل L بسازد.",false);path.showError();return;}
const value=WordPuzzlePathEngine.read(d.grid,selected),normalize=w=>WordPuzzleRepository.normalize(w);
if(normalize(value)!==normalize(d.word)&&normalize([...value].reverse().join(""))!==normalize(d.word)){
this.feedback(x,"واژه درست نیست؛ مسیر را پاک کن و دوباره تلاش کن.",false);path.showError();return;
}
this.afterSubmit(x,WordPuzzleEngine.submitL(selected));
};
}
};
WordPuzzleScreen.init();