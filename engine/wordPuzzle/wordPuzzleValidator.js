window.WordPuzzleValidator={
word(value,source){
const n=WordPuzzleRepository.normalize(value);
return !!n&&WordPuzzleRepository.getWords(source).some(x=>x.normalized===n);
},
familySelection(values,family){
const expected=new Set((family?.members||[]).map(x=>WordPuzzleRepository.normalize(x)));
const actual=new Set((values||[]).map(x=>WordPuzzleRepository.normalize(x)));
if(actual.size!==expected.size)return false;
for(const x of expected)if(!actual.has(x))return false;
return true;
}
};