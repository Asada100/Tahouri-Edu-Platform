// =====================================
// Tahouri Edu Platform
// Temporary Puzzle Test Launcher
// Version 1.1
// DEVELOPMENT ONLY
// =====================================

const PuzzleTestLauncher = {

    samples: [
        { id:"jigsawFrog3x3", title:"جورچین قورباغه", type:"jigsaw", objective:"تصویر را کامل کن", instruction:"قطعه‌ها را جابه‌جا کن تا تصویر کامل شود.", difficulty:2, content:{image:"assets/images/green_frog.jpg",rows:3,cols:3} },
        { id:"inputOutputTest", title:"ورودی و خروجی", type:"inputOutput", objective:"قاعده را پیدا کن", instruction:"قاعده تبدیل را پیدا کن و پاسخ را وارد کن.", difficulty:2, inputs:[2,4,7,9], outputs:[5,9,15,null], rule:{operation:"multiplyAdd",multiplier:2,add:1}, answer:19 },
        { id:"gridTest", title:"جدول عددی", type:"grid", objective:"عدد گمشده را پیدا کن", instruction:"قاعده جدول را پیدا کن و خانه خالی را کامل کن.", difficulty:2, rows:2,cols:3,cells:[2,4,6,3,null,27],missingIndices:[4],rules:[{row:1,operation:"multiply",value:3}],answers:[9] },
        { id:"wordGridTest", title:"واژه مرتبط", type:"wordGrid", objective:"واژه مرتبط را پیدا کن", instruction:"واژه مناسب را پیدا کن.", difficulty:2, words:["سریع",null],missingIndices:[1],relationType:"synonym",relation:{accepted:["تند","شتابان"]},answers:["تند"] },
        { id:"crossGridTest", title:"جدول متقاطع", type:"crossGrid", objective:"خانه گمشده را کامل کن", instruction:"با توجه به مسیرهای جدول، خانه خالی را کامل کن.", difficulty:2, rows:2,cols:2,cells:[2,4,6,null],missingIndices:[3],paths:[{cells:[0,1],operations:["add"],target:6},{cells:[0,2],operations:["add"],target:8},{cells:[2,3],operations:["add"],target:14},{cells:[1,3],operations:["add"],target:12}],answers:[8] }
    ],

    open: function(sample) {
        if (!sample || typeof ActivityManager === "undefined") return;
        if (typeof ActivitySessionManager !== "undefined" && ActivitySessionManager.clear) ActivitySessionManager.clear(sample.id);
        ActivityManager.load({
            id:sample.id,title:sample.title,engine:"puzzle",
            puzzle:{type:sample.type,source:"file",objective:sample.objective,instruction:sample.instruction,difficulty:sample.difficulty,
                image:sample.content && sample.content.image,rows:sample.rows || (sample.content && sample.content.rows),cols:sample.cols || (sample.content && sample.content.cols),
                cells:sample.cells,missingIndices:sample.missingIndices,paths:sample.paths,rules:sample.rules,answers:sample.answers,words:sample.words,
                relationType:sample.relationType,relation:sample.relation,inputs:sample.inputs,outputs:sample.outputs,rule:sample.rule,answer:sample.answer}
        });
    },

    render: function() {
        if (document.getElementById("puzzleTestLauncher")) return;
        const panel=document.createElement("aside");
        panel.id="puzzleTestLauncher"; panel.className="puzzleTestLauncher"; panel.dir="rtl";
        panel.innerHTML=`<button type="button" class="puzzleTestLauncherToggle" aria-expanded="false">🧩 آزمایش پازل</button><div class="puzzleTestLauncherMenu" hidden>${this.samples.map((s,i)=>`<button type="button" class="puzzleTestButton" data-index="${i}">${s.title}</button>`).join("")}</div>`;
        document.body.appendChild(panel);
        const toggle=panel.querySelector(".puzzleTestLauncherToggle"), menu=panel.querySelector(".puzzleTestLauncherMenu");
        toggle.addEventListener("click",function(){const open=!menu.hidden;menu.hidden=open;toggle.setAttribute("aria-expanded",String(!open));});
        panel.querySelectorAll(".puzzleTestButton").forEach(function(button){button.addEventListener("click",function(){menu.hidden=true;toggle.setAttribute("aria-expanded","false");PuzzleTestLauncher.open(PuzzleTestLauncher.samples[Number(this.dataset.index)]);});});
    }
};

window.PuzzleTestLauncher=PuzzleTestLauncher;
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",function(){PuzzleTestLauncher.render();});
else PuzzleTestLauncher.render();
console.log("Puzzle Test Launcher v1.1 Ready");
