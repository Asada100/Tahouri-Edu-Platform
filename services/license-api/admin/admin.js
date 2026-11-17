const API=window.location.origin;
let loggedIn=false;
async function api(p,o={}){const r=await fetch(API+p,{...o,credentials:"include",headers:{"Content-Type":"application/json",...(o.headers||{})}});const d=await r.json().catch(()=>({message:"پاسخ نامعتبر"}));if(r.status===401&&p.indexOf('/login')<0){showLogin();throw Error("نشست مدیر معتبر نیست.");}if(!r.ok)throw Error(d.message||"خطا");return d}
function e(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function showLogin(){loggedIn=false;document.getElementById("loginCard").hidden=false;document.getElementById("panel").hidden=true}
function showPanel(){loggedIn=true;document.getElementById("loginCard").hidden=true;document.getElementById("panel").hidden=false}
async function login(){const input=document.getElementById("adminKey"),err=document.getElementById("loginError");err.hidden=true;try{await api("/api/admin/login",{method:"POST",body:JSON.stringify({password:input.value})});input.value="";showPanel();await loadAll()}catch(x){err.textContent=x.message;err.hidden=false}}
async function logout(){try{await api("/api/admin/logout",{method:"POST"})}finally{showLogin()}}
async function revokeAllSessions(){if(!confirm("همه نشست‌های مدیریت در تمام دستگاه‌ها باطل می‌شوند و همه مدیران باید دوباره وارد شوند. ادامه می‌دهید؟"))return;try{const d=await api("/api/admin/sessions/revoke-all",{method:"POST"});alert("همه نشست‌ها باطل شدند. تعداد نشست‌های لغوشده: "+d.revokedSessions);showLogin()}catch(x){alert(x.message)}}
async function checkSession(){try{const d=await api("/api/admin/session");if(d.ok){showPanel();await loadAll()}else showLogin()}catch{showLogin()}}
async function loadHealth(){try{const d=await fetch(API+"/api/health",{cache:"no-store"}).then(r=>r.json());document.getElementById("health").textContent=d.ok?"سرویس سالم":"سرویس نیازمند بررسی";document.getElementById("healthDot").className=d.ok?"ok":"bad"}catch{document.getElementById("health").textContent="عدم اتصال";document.getElementById("healthDot").className="bad"}}
async function loadMetrics(){try{const d=await api("/api/metrics");const m=d.metrics;document.getElementById("stats").innerHTML=[
["فعال‌سازی موفق",m.activations],["تلاش‌های فعال‌سازی",m.activationAttempts],["مجوزهای فعال",m.activeLicenses],["حساب‌های فعال‌شده",m.activeStudents],["لغو مجوز",m.licenseRevocations]
].map(x=>"<div class='stat'><strong>"+e(x[1])+"</strong><span>"+e(x[0])+"</span></div>").join("")}catch{}}
async function loadAlerts(){try{const d=await api("/api/metrics/alerts"),card=document.getElementById("alertsCard");if(!d.alerts.length){card.hidden=true;return}card.hidden=false;document.getElementById("alerts").innerHTML=d.alerts.map(a=>"<div class='alert "+e(a.severity)+"'><strong>"+e(a.code)+"</strong><span>"+e(a.message)+"</span></div>").join("")}catch{}}
async function loadStudents(){
 const d=await api("/api/admin/students");
 const active=d.students.filter(x=>x.status==="active");
 const select=document.getElementById("studentId");
 const previous=select.value;
 select.innerHTML='<option value="">انتخاب دانش‌آموز ثبت‌شده</option>'+active.map(x=>'<option value="'+e(x.studentId)+'" data-grade="'+e(x.gradeId)+'">'+e(x.fullName)+' — '+e(x.gradeId)+' — '+e(x.studentId)+'</option>').join("");
 if(active.some(x=>x.studentId===previous))select.value=previous;
 select.onchange=()=>{const opt=select.selectedOptions[0];if(opt?.dataset.grade)document.getElementById("grade").value=opt.dataset.grade};
 document.getElementById("students").innerHTML=table(["نام دانش‌آموز","شناسهٔ حساب","پایه","وضعیت","تاریخ ثبت"],d.students.map(x=>[x.fullName,x.studentId,x.gradeId,x.status!=="active"?"بایگانی‌شده":(x.activationStatus==="active"?"فعال":"غیرفعال"),x.createdAt]));
}
async function importStudentsFile(){
 try{
  const input=document.getElementById("studentProfilesFile");
  const file=input.files&&input.files[0];
  if(!file)throw Error("ابتدا فایل خروجی پروفایل‌های بازی را انتخاب کنید.");
  const data=JSON.parse(await file.text());
  if(data.format!=="tahouri-student-profiles"||data.version!==1||!Array.isArray(data.profiles))throw Error("ساختار فایل پروفایل‌های طهوری معتبر نیست.");
  const result=await api("/api/admin/students/import",{method:"POST",body:JSON.stringify({profiles:data.profiles})});
  input.value="";
  await loadStudents();
  alert("ورود فهرست انجام شد. پروفایل جدید: "+result.imported+"، قبلاً ثبت‌شده: "+result.alreadyRegistered+"، مجموع: "+result.total);
 }catch(x){alert(x.message)}
}
async function loadCodes(){const d=await api("/api/admin/codes");document.getElementById("codes").innerHTML=table(["کد","شناسه دانش‌آموز","پایه","سال","نوع رزرو","وضعیت","ساخته‌شده","استفاده‌شده","مجوز"],d.codes.map(x=>[x.codePreview,x.studentId||"—",x.gradeId,x.academicYear,x.renewalMode==="repeat"?"تکرار پایه":"پایه سال بعد",x.status,x.createdAt,x.usedAt||"—",x.licenseId||"—"]))}
async function loadLicenses(){const d=await api("/api/admin/licenses");document.getElementById("licenses").innerHTML=table(["مجوز","پروفایل","پایه","سال","از","تا","وضعیت"],d.licenses.map(x=>[x.licenseId,x.studentId,x.gradeId,x.academicYear,x.validFrom,x.validUntil,x.status]))}
async function loadPayments(){const d=await api("/api/admin/payments");document.getElementById("payments").innerHTML=table(["شناسه","درگاه","وضعیت","مبلغ","پایه","سال","مجوز","زمان"],d.payments.map(x=>[x.paymentId,x.provider,x.status,(x.amount??"")+" "+(x.currency??""),x.gradeId||"—",x.academicYear||"—",x.licenseId||"—",x.createdAt]))}
async function loadAudit(){const d=await api("/api/admin/audit");document.getElementById("audit").innerHTML=table(["رویداد","عامل","مجوز","زمان","جزئیات"],d.audit.map(x=>[x.eventType,x.actor,x.licenseId||"—",x.createdAt,JSON.stringify(x.metadata||{})]))}
function table(headers,rows){if(!rows.length)return "<p class='muted'>موردی وجود ندارد.</p>";return "<div class='table-wrap'><table><thead><tr>"+headers.map(h=>"<th>"+e(h)+"</th>").join("")+"</tr></thead><tbody>"+rows.map(r=>"<tr>"+r.map(v=>"<td>"+e(v)+"</td>").join("")+"</tr>").join("")+"</tbody></table></div>"}
async function createBulkCodesFromFile(){
 try{
  const input=document.getElementById("bulkProfilesFile");
  const file=input.files&&input.files[0];
  if(!file)throw Error("ابتدا فایل خروجی پروفایل‌های طهوری را انتخاب کنید.");
  const data=JSON.parse(await file.text());
  if(data.format!=="tahouri-student-profiles"||data.version!==1||!Array.isArray(data.profiles))throw Error("ساختار فایل پروفایل‌های طهوری معتبر نیست.");
  if(data.profiles.length<1||data.profiles.length>100)throw Error("تعداد پروفایل‌ها باید بین ۱ تا ۱۰۰ باشد.");
  const studentIds=data.profiles.map(profile=>String(profile?.studentId||"").trim());
  if(studentIds.some(id=>!id)||new Set(studentIds).size!==studentIds.length)throw Error("شناسه‌های فایل خالی یا تکراری هستند.");
  if(!confirm("برای "+studentIds.length+" پروفایل، دقیقاً یک کد با پایه فعلی و برای سال تحصیلی جاری صادر شود؟ کدها فقط همین بار نمایش داده می‌شوند."))return;
  const button=document.getElementById("bulkIssueButton");
  if(button)button.disabled=true;
  try{
   const d=await api("/api/admin/codes/bulk",{method:"POST",body:JSON.stringify({studentIds})});
   const box=document.getElementById("bulkNewCodes");
   box.textContent="سال تحصیلی "+d.academicYear+" — تعداد کد: "+d.count+"\\n"+d.codes.map(x=>[x.fullName,x.studentId,x.gradeId,x.code].join(" | ")).join("\\n");
   box.hidden=false;
   input.value="";
   await loadCodes();
   alert("صدور گروهی کامل شد. "+d.count+" کد ساخته شد؛ کدها را اکنون ذخیره کنید.");
  }finally{if(button)button.disabled=false;}
 }catch(x){alert(x.message)}
}
async function createCodes(){try{const count=Number(document.getElementById("count").value);if(!Number.isInteger(count)||count<1||count>100)throw Error("تعداد باید بین ۱ تا ۱۰۰ باشد.");const d=await api("/api/admin/codes",{method:"POST",body:JSON.stringify({studentId:document.getElementById("studentId").value,gradeId:document.getElementById("grade").value.trim(),academicYear:document.getElementById("year").value.trim(),renewalMode:document.getElementById("renewalMode").value,count})});const box=document.getElementById("newCodes");box.textContent=d.codes.join("\n");box.hidden=false;await loadCodes();alert("کدها ساخته شدند. کد کامل را همین حالا ذخیره کنید.")}catch(x){alert(x.message)}}
async function revokeCode(){try{const code=document.getElementById("revokeCode").value.trim();if(!code)throw Error("کد را وارد کنید.");if(!confirm("این کد لغو شود؟"))return;await api("/api/admin/codes/revoke",{method:"POST",body:JSON.stringify({code})});document.getElementById("revokeCode").value="";await loadCodes();alert("کد لغو شد.")}catch(x){alert(x.message)}}
async function revokeLicense(){try{const licenseId=document.getElementById("licenseIdAction").value.trim();if(!licenseId)throw Error("License ID را وارد کنید.");if(!confirm("این مجوز لغو شود؟"))return;await api("/api/admin/licenses/revoke",{method:"POST",body:JSON.stringify({licenseId})});await loadLicenses();alert("مجوز لغو شد.")}catch(x){alert(x.message)}}
async function extendLicense(){try{const licenseId=document.getElementById("licenseIdAction").value.trim(),v=document.getElementById("extendUntil").value;if(!licenseId||!v)throw Error("License ID و تاریخ پایان را وارد کنید.");await api("/api/admin/licenses/extend",{method:"POST",body:JSON.stringify({licenseId,validUntil:new Date(v).toISOString()})});await loadLicenses();alert("مجوز تمدید شد.")}catch(x){alert(x.message)}}
async function searchAll(){try{const q=document.getElementById("searchQ").value.trim();if(!q)throw Error("عبارت جستجو را وارد کنید.");const d=await api("/api/admin/search?q="+encodeURIComponent(q));document.getElementById("searchResults").innerHTML="<h3>مجوزها</h3>"+table(["مجوز","پروفایل","پایه","سال","وضعیت"],d.licenses.map(v=>[v.licenseId,v.studentId,v.gradeId,v.academicYear,v.status]))+"<h3>کدها</h3>"+table(["کد","پایه","سال","وضعیت","مجوز"],d.codes.map(v=>[v.codePreview,v.gradeId,v.academicYear,v.status,v.licenseId||"—"]))}catch(x){alert(x.message)}}
async function loadAll(){await loadHealth();await Promise.all([loadMetrics(),loadAlerts(),loadStudents(),loadCodes(),loadLicenses(),loadPayments(),loadAudit()])}
document.addEventListener("click", event => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const actions = { login, loadAll, logout, revokeAllSessions, searchAll, loadStudents, importStudentsFile, createBulkCodesFromFile, loadCodes, createCodes, revokeCode, loadLicenses, revokeLicense, loadPayments, loadAudit };
  if (Object.prototype.hasOwnProperty.call(actions, action)) actions[action]();
});
document.addEventListener("keydown", event => {
  if (event.key === "Enter" && event.target.dataset.enterAction === "searchAll") searchAll();
});

loadHealth();checkSession();