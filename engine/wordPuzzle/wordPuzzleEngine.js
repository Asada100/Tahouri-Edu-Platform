const WordPuzzleEngine={
version:"1.1",
activity:null,
state:null,
round:null,

start(a){
this.activity=a||{};
const total=Math.max(1,Number(a?.settings?.rounds)||5);
this.state={started:true,finished:false,round:0,total,correct:0,wrong:0,score:0,hints:0};
this.next();
return this.getState();
},

next(){
const modes=(this.activity?.settings?.modes||["wordBuilder","wordSearch","wordFamily","lPath"]).filter(Boolean);
const mode=modes[this.state.round%modes.length]||"wordBuilder";
this.state.hints=0;
this.round=this.build(mode);
this.state.mode=mode;
this.emitReady();
},

build(mode){
if(mode==="wordBuilder")return this.builder();
if(mode==="wordSearch")return this.search();
if(mode==="wordFamily")return this.family();
return this.lpath();
},

builder(){
const words=WordPuzzleRepository.getWords(this.activity);
const w=words[this.state.round%words.length]||{word:"دانش",clue:"واژه را بساز."};
const letters=[...w.word];
return{
type:"wordBuilder",
title:"کلمه‌ساز",
instruction:w.clue||"با حروف زیر واژه را بساز.",
word:w.word,
letters:this.shuffle(letters.map((letter,index)=>({letter,index}))).map(x=>x.letter)
};
},

search(){
const difficulty=WordPuzzleDifficulty.settings(this.activity?.settings?.difficulty||2);
const source=WordPuzzleRepository.getWords(this.activity);
const candidates=this.shuffle(source.slice());\nconst words=[];
const n=difficulty.grid;
const grid=Array.from({length:n},()=>Array(n).fill(""));
for(const candidate of candidates){
if(words.length>=Math.min(difficulty.words,candidates.length))break;
if(this.placeWord(grid,candidate.word))words.push(candidate.word);
}
this.fill(grid);
return{
type:"wordSearch",
title:"واژه‌یاب",
instruction:"واژه‌ها را در جدول پیدا کن؛ افقی، عمودی و اریب.",
grid,
words
};
},

placeWord(grid,word){
const dirs=WordPuzzlePathEngine.directions;
for(let attempt=0;attempt<600;attempt++){
const d=dirs[Math.floor(Math.random()*dirs.length)];
const r=Math.floor(Math.random()*grid.length);
const c=Math.floor(Math.random()*grid.length);
const endR=r+d[0]*(word.length-1),endC=c+d[1]*(word.length-1);
if(endR<0||endR>=grid.length||endC<0||endC>=grid.length)continue;
let ok=true;
for(let i=0;i<word.length;i++){
const cell=grid[r+d[0]*i][c+d[1]*i];
if(cell&&cell!==word[i]){ok=false;break;}
}
if(!ok)continue;
for(let i=0;i<word.length;i++)grid[r+d[0]*i][c+d[1]*i]=word[i];
return true;
}
return false;
},

family(){
const families=WordPuzzleRepository.getFamilies(this.activity);
const family=families[this.state.round%families.length]||{base:"",members:[]};
const correct=[...family.members];
const decoys=WordPuzzleRepository.getWords(this.activity)
.map(x=>x.word)
.filter(w=>!correct.some(c=>WordPuzzleRepository.normalize(c)===WordPuzzleRepository.normalize(w)))
.slice(0,4);
return{
type:"wordFamily",
title:"خانواده واژه‌ها",
instruction:"همه واژه‌های هم‌خانواده را انتخاب کن.",
base:family.base,
options:this.shuffle([...correct,...decoys]).slice(0,Math.max(correct.length,4)),
answers:correct
};
},

lpath(){
const words=WordPuzzleRepository.getWords(this.activity).filter(x=>x.word.length>=4);
const w=words[this.state.round%Math.max(1,words.length)]||{word:"دانش"};
const n=7,grid=Array.from({length:n},()=>Array(n).fill(""));
const path=[];
const horizontal=Math.min(3,w.word.length-1);
let r=1,c=1;
for(let i=0;i<w.word.length;i++){
if(i===horizontal){r++;c=1;}
path.push([r,c]);
grid[r][c]=w.word[i];
if(i<horizontal)c++;else r++;
if(r>=n&&i<w.word.length-1)break;
}
this.fill(grid);
return{
type:"lPath",
title:"مسیر واژه",
instruction:"حروف واژه را با یک مسیر L شکل پیدا کن.",
grid,
word:w.word,
path
};
},

submit(ok){
if(!this.state?.started||this.state.finished)return false;
const correct=!!ok;
if(correct){
this.state.correct++;
this.state.score+=WordPuzzleScore.correct(10,this.state.hints);
}else{
this.state.wrong++;
}
this.state.round++;
if(this.state.round>=this.state.total)return this.finish();
this.next();
return correct;
},

submitBuilder(value){
const target=WordPuzzleRepository.normalize(this.round?.word);
const answer=WordPuzzleRepository.normalize(value);
return this.submit(!!target&&answer===target);
},

submitFamily(values){
return this.submit(WordPuzzleValidator.familySelection(values,this.round));
},

submitSearch(path){
if(!WordPuzzlePathEngine.valid(this.round.grid,path)||!WordPuzzlePathEngine.straight(path))return this.submit(false);
const value=WordPuzzlePathEngine.read(this.round.grid,path);
const reverse=[...value].reverse().join("");
return this.submit(this.round.words.some(w=>w===value||w===reverse));
},

submitL(path){
if(!WordPuzzlePathEngine.valid(this.round.grid,path)||!WordPuzzlePathEngine.isL(path))return this.submit(false);
const value=WordPuzzlePathEngine.read(this.round.grid,path);
const reverse=[...value].reverse().join("");
return this.submit(value===this.round.word||reverse===this.round.word);
},

hint(){
if(this.state.finished)return null;
this.state.hints++;
return WordPuzzleHint.letter(this.round,this.state.hints-1);
},

finish(){
this.state.finished=true;
const percentage=Math.round(this.state.correct/this.state.total*100);
const result=typeof ActivityResult!=="undefined"&&ActivityResult.create
?ActivityResult.create({
activityId:this.activity?.id||"persianWordPuzzle",
score:this.state.score,
percentage,
totalQuestions:this.state.total,
correctAnswers:this.state.correct,
wrongAnswers:this.state.wrong,
message:"🎉 آفرین! بازی واژه‌ها را کامل کردی."
})
:{activityId:this.activity?.id||"persianWordPuzzle",score:this.state.score,percentage,totalQuestions:this.state.total,correctAnswers:this.state.correct,wrongAnswers:this.state.wrong,message:"🎉 آفرین! بازی واژه‌ها را کامل کردی."};
if(typeof EventManager!=="undefined")EventManager.emit("activityFinished",result);
return result;
},

emitReady(){
if(typeof EventManager!=="undefined")EventManager.emit("activityReady",{engineName:"WordPuzzleEngine",engine:this,result:this.getState()});
},

getState(){return{...this.state,data:this.round};},

fill(grid){
const letters="ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی";
for(let r=0;r<grid.length;r++)for(let c=0;c<grid[r].length;c++)if(!grid[r][c])grid[r][c]=letters[Math.floor(Math.random()*letters.length)];
},

shuffle(a){
for(let i=a.length-1;i>0;i--){
const j=Math.floor(Math.random()*(i+1));
[a[i],a[j]]=[a[j],a[i]];
}
return a;
}
};
window.WordPuzzleEngine=WordPuzzleEngine;
console.log("Word Puzzle Engine v1.1 Ready");