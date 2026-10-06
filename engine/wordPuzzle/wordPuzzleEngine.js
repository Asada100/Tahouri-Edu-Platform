const WordPuzzleEngine={
version:"1.3",
activity:null,state:null,round:null,

start(a){
this.activity=a||{};
const total=Math.max(1,Number(a?.settings?.rounds)||5);
this.state={started:true,finished:false,round:0,total,correct:0,wrong:0,score:0,hints:0};
this.next(); return this.getState();
},

next(){
const modes=(this.activity?.settings?.modes||["wordBuilder","wordSearch","wordFamily","lPath"]).filter(Boolean);
const mode=modes[this.state.round%modes.length]||"wordBuilder";
this.state.hints=0; this.round=this.build(mode); this.state.mode=mode; this.emitReady();
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
return{type:"wordBuilder",title:"کلمه‌ساز",instruction:w.clue||"با حروف زیر واژه را بساز.",word:w.word,letters:this.shuffle([...w.word])};
},

search(){
const difficulty=WordPuzzleDifficulty.settings(this.activity?.settings?.difficulty||2);
const source=this.shuffle(WordPuzzleRepository.getWords(this.activity).slice());
const targetCount=Math.min(difficulty.words,source.length);
let best={words:[],grid:[],placements:[]};
for(let retry=0;retry<20;retry++){
const grid=Array.from({length:difficulty.grid},()=>Array(difficulty.grid).fill(""));
const placements=[];
for(const candidate of source){
if(placements.length>=targetCount)break;
const path=this.placeWord(grid,candidate.word);
if(path)placements.push({word:candidate.word,path});
}
if(placements.length>best.words.length)best={words:placements.map(x=>x.word),grid,placements};
if(placements.length===targetCount)break;
}
this.fill(best.grid);
return{type:"wordSearch",title:"واژه‌یاب",instruction:"واژه‌ها را در جدول پیدا کن؛ افقی، عمودی و اریب.",grid:best.grid,words:best.words,placements:best.placements};
},

placeWord(grid,word){
const dirs=WordPuzzlePathEngine.directions;
for(let attempt=0;attempt<600;attempt++){
const d=dirs[Math.floor(Math.random()*dirs.length)],r=Math.floor(Math.random()*grid.length),c=Math.floor(Math.random()*grid.length);
const endR=r+d[0]*(word.length-1),endC=c+d[1]*(word.length-1);
if(endR<0||endR>=grid.length||endC<0||endC>=grid.length)continue;
let ok=true;
for(let i=0;i<word.length;i++){const cell=grid[r+d[0]*i][c+d[1]*i];if(cell&&cell!==word[i]){ok=false;break;}}
if(!ok)continue;
const path=[];
for(let i=0;i<word.length;i++){grid[r+d[0]*i][c+d[1]*i]=word[i];path.push([r+d[0]*i,c+d[1]*i]);}
return path;
}
return false;
},

family(){
const families=WordPuzzleRepository.getFamilies(this.activity);
const family=families[this.state.round%families.length]||{base:"",members:[]};
const correct=[...family.members];
const allMembers=WordPuzzleRepository.getAllFamilyMembers(this.activity);
const decoys=this.shuffle(allMembers.filter(w=>!correct.some(c=>WordPuzzleRepository.normalize(c)===WordPuzzleRepository.normalize(w)))).slice(0,4);
return{type:"wordFamily",title:"خانواده واژه‌ها",instruction:"همه واژه‌های هم‌خانواده را انتخاب کن.",base:family.base,options:this.shuffle([...correct,...decoys]),answers:correct};
},

lpath(){
const words=WordPuzzleRepository.getWords(this.activity).filter(x=>x.word.length>=4);
const w=words[this.state.round%Math.max(1,words.length)]||{word:"دانش",clue:"واژه را در مسیر L شکل پیدا کن."};
const n=7,grid=Array.from({length:n},()=>Array(n).fill("")),path=[];
const horizontal=Math.min(3,w.word.length-1);
let r=1,c=1;
for(let i=0;i<w.word.length;i++){
path.push([r,c]);grid[r][c]=w.word[i];
if(i<horizontal)c++;else r++;
if(r>=n&&i<w.word.length-1)break;
}
this.fill(grid);
return{type:"lPath",title:"مسیر واژه",instruction:"حروف واژه را با یک مسیر L شکل پیدا کن.",grid,word:w.word,clue:w.clue||"واژه را در مسیر L شکل پیدا کن.",path};
},

submit(ok){
if(!this.state?.started||this.state.finished)return{correct:false,finished:true};
const correct=!!ok;
if(correct){this.state.correct++;this.state.score+=WordPuzzleScore.correct(10,this.state.hints);}
else this.state.wrong++;
this.state.round++;
if(this.state.round>=this.state.total){
const result=this.finish();
return{correct,finished:true,...result};
}
this.next();
return{correct,finished:false,state:this.getState()};
},

submitBuilder(value){
const target=WordPuzzleRepository.normalize(this.round?.word),answer=WordPuzzleRepository.normalize(value);
return this.submit(!!target&&answer===target);
},

submitFamily(values){return this.submit(WordPuzzleValidator.familySelection(values,this.round));},

submitSearch(path){
if(!WordPuzzlePathEngine.valid(this.round.grid,path)||!WordPuzzlePathEngine.straight(path))return this.submit(false);
const value=WordPuzzlePathEngine.read(this.round.grid,path),reverse=[...value].reverse().join("");
return this.submit(this.round.words.some(w=>w===value||w===reverse));
},

submitL(path){
if(!WordPuzzlePathEngine.valid(this.round.grid,path)||!WordPuzzlePathEngine.isL(path))return this.submit(false);
const value=WordPuzzlePathEngine.read(this.round.grid,path),reverse=[...value].reverse().join("");
return this.submit(value===this.round.word||reverse===this.round.word);
},

hint(){
if(this.state.finished)return null;
this.state.hints++;
const index=this.state.hints-1;
if(this.round?.type==="wordBuilder")return{type:"letter",value:WordPuzzleHint.letter(this.round,index)||this.round?.word?.[0]||null};
if(this.round?.type==="wordSearch"){
const cell=this.round.placements?.[0]?.path?.[0];
return cell?{type:"cell",value:cell}:null;
}
if(this.round?.type==="lPath"){
const cell=this.round.path?.[0];
return cell?{type:"cell",value:cell}:null;
}
if(this.round?.type==="wordFamily"){
const answer=this.round.answers?.[index%Math.max(1,this.round.answers.length)];
return{type:"letter",value:answer?.[0]||null};
}
return null;
},

finish(){
this.state.finished=true;
const percentage=Math.round(this.state.correct/this.state.total*100);
const result=typeof ActivityResult!=="undefined"&&ActivityResult.create
?ActivityResult.create({activityId:this.activity?.id||"persianWordPuzzle",score:this.state.score,percentage,totalQuestions:this.state.total,correctAnswers:this.state.correct,wrongAnswers:this.state.wrong,message:"🎉 آفرین! بازی واژه‌ها را کامل کردی."})
:{activityId:this.activity?.id||"persianWordPuzzle",score:this.state.score,percentage,totalQuestions:this.state.total,correctAnswers:this.state.correct,wrongAnswers:this.state.wrong,message:"🎉 آفرین! بازی واژه‌ها را کامل کردی."};
if(typeof EventManager!=="undefined")EventManager.emit("activityFinished",result);
return result;
},

emitReady(){if(typeof EventManager!=="undefined")EventManager.emit("activityReady",{engineName:"WordPuzzleEngine",engine:this,result:this.getState()});},
getState(){return{...this.state,data:this.round};},
fill(grid){const letters="ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی";for(let r=0;r<grid.length;r++)for(let c=0;c<grid[r].length;c++)if(!grid[r][c])grid[r][c]=letters[Math.floor(Math.random()*letters.length)];},
shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
};
window.WordPuzzleEngine=WordPuzzleEngine;
console.log("Word Puzzle Engine v1.3 Ready");