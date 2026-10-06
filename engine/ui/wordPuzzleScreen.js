const WordPuzzleScreen={
init(){
if(typeof EventManager==="undefined")return;
EventManager.on("activityReady",p=>{
if(p?.engineName==="WordPuzzleEngine")this.render(p.result);
});
},
render(s){
let root=document.getElementById("app");
if(!root)return;
root.innerHTML="";
let box=document.createElement("main");
box.className="wp-shell";
box.dir="rtl";
box.innerHTML="<div class='wp-top'>مرحله "+s.round+" از "+s.total+" <b>⭐ "+s.score+"</b></div><h1>"+s.data?.title+"</h1><p>"+s.data?.instruction+"</p><div id='wp'></div>";
root.appendChild(box);
let x=box.querySelector("#wp");
if(s.data?.type==="wordBuilder")this.builder(x,s.data);
else if(s.data?.type==="wordSearch")this.search(x,s.data);
else if(s.data?.type==="wordFamily")this.family(x,s.data);
else if(s.data?.type==="crossword")this.cross(x,s.data);
else this.lpath(x,s.data);
},
builder(x,d){
let selected=[];
x.innerHTML="<div class='wp-card'><div class='wp-answer' aria-live='polite'>پاسخ شما</div><div class='wp-letters'></div><button class='wp-btn'>بررسی</button></div>";
let answer=x.querySelector(".wp-answer");
let q=x.querySelector(".wp-letters");

const updateAnswer=()=>{
answer.textContent=selected.length?selected.map(i=>d.letters[i]).join(""):"پاسخ شما";
answer.classList.toggle("has-value",selected.length>0);
};

d.letters.forEach((l,i)=>{
let b=document.createElement("button");
b.type="button";
b.textContent=l;
b.setAttribute("aria-label","حرف "+l);
b.onclick=()=>{
let pos=selected.indexOf(i);
if(pos>=0){
selected.splice(pos,1);
b.classList.remove("sel");
}else{
selected.push(i);
b.classList.add("sel");
}
updateAnswer();
};
q.appendChild(b);
});

x.querySelector(".wp-btn").onclick=()=>{
WordPuzzleEngine.submitBuilder(selected.map(i=>d.letters[i]).join(""));
};
},
family(x,d){
x.innerHTML="<div class='wp-card'><h2>واژه پایه: "+d.base+"</h2><div class='wp-options'></div></div>";
d.options.forEach(w=>{
let b=document.createElement("button");
b.textContent=w;
b.onclick=()=>WordPuzzleEngine.submitFamily(w);
x.querySelector(".wp-options").appendChild(b);
});
},
search(x,d){
let p=[];
x.innerHTML="<div class='wp-card'><div class='wp-grid'></div><button class='wp-btn'>ثبت مسیر</button><div class='wp-list'>"+d.words.join(" • ")+"</div></div>";
let g=x.querySelector(".wp-grid");
d.grid.forEach((row,r)=>row.forEach((l,c)=>{
let b=document.createElement("button");
b.textContent=l;
b.onclick=()=>{
let k=r+","+c,i=p.indexOf(k);
if(i>=0)p.splice(i,1);else p.push(k);
b.classList.toggle("sel",i<0);
};
g.appendChild(b);
}));
x.querySelector(".wp-btn").onclick=()=>WordPuzzleEngine.submitSearch(p.map(k=>k.split(",").map(Number)));
},
cross(x,d){
x.innerHTML="<div class='wp-card'>"+d.entries.map((e,i)=>"<label>"+(e.clue||"واژه")+" <input data-i='"+i+"'></label>").join("")+"<button class='wp-btn'>بررسی</button></div>";
x.querySelector(".wp-btn").onclick=()=>{
let a=[...x.querySelectorAll("input")].map(i=>i.value);
WordPuzzleEngine.submit(d.entries.every((e,i)=>WordPuzzleRepository.normalize(e.word)===WordPuzzleRepository.normalize(a[i])));
};
},
lpath(x,d){
let p=[];
x.innerHTML="<div class='wp-card'><h2>واژه هدف: "+d.word+"</h2><div class='wp-grid'></div><button class='wp-btn'>بررسی مسیر</button></div>";
d.grid.forEach((row,r)=>row.forEach((l,c)=>{
let b=document.createElement("button");
b.textContent=l;
b.onclick=()=>{
let k=r+","+c,i=p.indexOf(k);
if(i>=0)p.splice(i,1);else p.push(k);
b.classList.toggle("sel",i<0);
};
x.querySelector(".wp-grid").appendChild(b);
}));
x.querySelector(".wp-btn").onclick=()=>WordPuzzleEngine.submitL(p.map(k=>k.split(",").map(Number)));
}
};
WordPuzzleScreen.init();