(function () {
  "use strict";

  const KEY = "Tahouri_Cloud_Account";
  const API = (window.TahouriServiceConfig && window.TahouriServiceConfig.apiBaseUrl || "").replace(/\/$/, "");
  let modal;

  function el(tag, attrs, text) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (key === "className") node.className = value;
      else if (key === "html") node.innerHTML = value;
      else node.setAttribute(key, value);
    });
    if (text != null) node.textContent = text;
    return node;
  }
  function saved() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (_) { return null; }
  }
  function save(account) {
    let profile = window.ProfileManager && ProfileManager.get ? ProfileManager.get() : null;
    if ((!profile || !profile.studentId) && window.ProfileManager && typeof ProfileManager.createProfile === "function") {
      ProfileManager.createProfile({
        studentId: account.studentId,
        name: account.fullName || "",
        grade: account.gradeId || null
      });
      profile = ProfileManager.get();
    }
    const value = {
      studentId: account.studentId,
      fullName: account.fullName || "",
      gradeId: account.gradeId || "",
      localProfileId: profile && profile.studentId || null,
      linkedAt: new Date().toISOString()
    };
    localStorage.setItem(KEY, JSON.stringify(value));
    return value;
  }
  async function request(path, method, body) {
    if (!API) throw new Error("نشانی سرویس حساب دانش‌آموز تنظیم نشده است.");
    const response = await fetch(API + path, {
      method: method || "GET",
      credentials: "include",
      headers: body ? { "content-type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store"
    });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok || data.ok === false) throw new Error(data.message || "ارتباط با سرویس حساب انجام نشد.");
    return data;
  }
  function gradeValue(grade) {
    if (!grade) return "";
    const value = String(grade);
    if (/^grade[1-6]$/.test(value)) return value;
    const match = value.match(/[1-6]/);
    return match ? "grade" + match[0] : "";
  }
  function showMessage(message, error) {
    const box = modal && modal.querySelector("[data-account-message]");
    if (!box) return;
    box.textContent = message || "";
    box.style.color = error ? "#b42318" : "#167447";
  }
  function close() {
    if (modal) modal.remove();
    modal = null;
  }
  function makeField(label, input) {
    const wrap = el("label", { className: "tahouri-account-field" });
    wrap.appendChild(el("span", {}, label));
    wrap.appendChild(input);
    return wrap;
  }
  function open() {
    if (modal) return;
    modal = el("div", { className: "tahouri-account-overlay", role: "presentation" });
    const panel = el("section", { className: "tahouri-account-panel", role: "dialog", "aria-modal": "true", "aria-labelledby": "tahouri-account-title", dir: "rtl" });
    const closeButton = el("button", { type: "button", className: "tahouri-account-close", "aria-label": "بستن" }, "×");
    closeButton.onclick = close;
    panel.appendChild(closeButton);
    panel.appendChild(el("h2", { id: "tahouri-account-title" }, "حساب دانش‌آموزی طهوری"));
    panel.appendChild(el("p", { className: "tahouri-account-intro" }, "با یک حساب، در دستگاه‌های مختلف وارد شوید. ایمیل لازم نیست."));
    const content = el("div", { className: "tahouri-account-content" });
    panel.appendChild(content);
    panel.appendChild(el("p", { className: "tahouri-account-message", "data-account-message": "", "aria-live": "polite" }));
    modal.appendChild(panel);
    modal.addEventListener("click", event => { if (event.target === modal) close(); });
    document.addEventListener("keydown", function onEscape(event) {
      if (event.key === "Escape" && modal) { close(); document.removeEventListener("keydown", onEscape); }
    });
    document.body.appendChild(modal);
    renderAccount(content);
  }
  function renderAccount(content) {
    content.replaceChildren();
    const account = saved();
    if (account) {
      const card = el("div", { className: "tahouri-account-card" });
      card.appendChild(el("strong", {}, "حساب متصل"));
      card.appendChild(el("p", {}, account.fullName || "دانش‌آموز"));
      const id = el("code", { dir: "ltr" }, account.studentId);
      card.appendChild(id);
      const copy = el("button", { type: "button", className: "tahouri-account-secondary" }, "کپی شناسه");
      copy.onclick = async () => {
        try { await navigator.clipboard.writeText(account.studentId); showMessage("شناسه کپی شد."); }
        catch (_) { showMessage("کپی خودکار ممکن نیست؛ شناسه را انتخاب و کپی کنید.", true); }
      };
      card.appendChild(copy);
      const logout = el("button", { type: "button", className: "tahouri-account-primary" }, "خروج از حساب");
      logout.onclick = async () => {
        logout.disabled = true;
        try {
          await request("/students/logout", "POST", {});
          localStorage.removeItem(KEY);
          showMessage("از حساب خارج شدید.");
          renderAccount(content);
        } catch (error) { showMessage(error.message, true); logout.disabled = false; }
      };
      card.appendChild(logout);
      content.appendChild(card);
      request("/students/session").then(data => {
        if (data.student) save(data.student);
      }).catch(() => {
        showMessage("نشست سرور در دسترس نیست؛ برای استفاده از حساب دوباره وارد شوید.", true);
      });
      return;
    }
    const tabs = el("div", { className: "tahouri-account-tabs" });
    const form = el("form", { className: "tahouri-account-form" });
    const register = el("button", { type: "button", className: "tahouri-account-tab active" }, "ساخت حساب");
    const login = el("button", { type: "button", className: "tahouri-account-tab" }, "ورود");
    tabs.append(register, login);
    content.append(tabs, form);
    let mode = "register";
    const draw = () => {
      form.replaceChildren();
      register.classList.toggle("active", mode === "register");
      login.classList.toggle("active", mode === "login");
      const profile = window.ProfileManager && ProfileManager.get ? ProfileManager.get() : null;
      if (mode === "register") {
        const name = el("input", { name: "fullName", type: "text", maxlength: "160", autocomplete: "name", required: "required", value: profile && profile.name || "", placeholder: "نام نمایشی دانش‌آموز" });
        const grade = el("select", { name: "gradeId", required: "required" });
        grade.appendChild(el("option", { value: "" }, "انتخاب پایه"));
        for (let i = 1; i <= 6; i++) {
          const option = el("option", { value: "grade" + i }, "پایه " + ["اول","دوم","سوم","چهارم","پنجم","ششم"][i - 1]);
          if (gradeValue(profile && profile.grade) === "grade" + i) option.selected = true;
          grade.appendChild(option);
        }
        form.append(makeField("نام نمایشی", name), makeField("پایهٔ تحصیلی", grade));
      } else {
        const id = el("input", { name: "studentId", type: "text", dir: "ltr", autocomplete: "username", required: "required", placeholder: "شناسهٔ دانش‌آموز" });
        form.appendChild(makeField("شناسهٔ دانش‌آموز", id));
      }
      const password = el("input", { name: "password", type: "password", minlength: "10", maxlength: "128", autocomplete: mode === "register" ? "new-password" : "current-password", required: "required", placeholder: "حداقل ۱۰ نویسه" });
      form.appendChild(makeField("رمز عبور", password));
      if (mode === "register") {
        const confirm = el("input", { name: "confirmPassword", type: "password", minlength: "10", maxlength: "128", autocomplete: "new-password", required: "required", placeholder: "تکرار رمز عبور" });
        form.appendChild(makeField("تکرار رمز عبور", confirm));
      }
      const submit = el("button", { type: "submit", className: "tahouri-account-primary" }, mode === "register" ? "ساخت حساب و دریافت شناسه" : "ورود به حساب");
      form.appendChild(submit);
      form.onsubmit = async event => {
        event.preventDefault();
        submit.disabled = true;
        showMessage("در حال ارتباط با سرویس...");
        const values = new FormData(form);
        const payload = mode === "register"
          ? { fullName: values.get("fullName"), gradeId: values.get("gradeId"), password: values.get("password") }
          : { studentId: values.get("studentId").trim(), password: values.get("password") };
        if (mode === "register" && payload.password !== values.get("confirmPassword")) {
          showMessage("رمز عبور و تکرار آن یکسان نیستند.", true); submit.disabled = false; return;
        }
        try {
          const data = await request(mode === "register" ? "/students/register" : "/students/login", "POST", payload);
          save(data.student);
          showMessage("حساب با موفقیت آماده شد. شناسهٔ دائمی شما: " + data.student.studentId);
          renderAccount(content);
        } catch (error) {
          showMessage(error.message || "عملیات انجام نشد.", true);
          submit.disabled = false;
        }
      };
    };
    register.onclick = () => { mode = "register"; draw(); showMessage(""); };
    login.onclick = () => { mode = "login"; draw(); showMessage(""); };
    draw();
  }
  function init() {
    if (document.getElementById("tahouri-account-launcher")) return;
    const button = el("button", { id: "tahouri-account-launcher", type: "button", "aria-label": "حساب دانش‌آموزی" }, "👤 حساب دانش‌آموزی");
    button.onclick = open;
    document.body.appendChild(button);
  }
  window.StudentAccountScreen = { open };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
