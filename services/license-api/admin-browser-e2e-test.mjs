import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = "http://127.0.0.1:8787";
const adminPassword = "browser-e2e-only-password";
const fixturePath = new URL("./fixtures/admin-browser-e2e-profiles.json", import.meta.url);
const fixtureBuffer = await readFile(fixturePath);
const browser = await chromium.launch({ headless: true });
const pageErrors = [];

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on("pageerror", error => pageErrors.push(error.message));
  const dialogMessages = [];
  page.on("dialog", dialog => { dialogMessages.push(dialog.message()); return dialog.accept(); });

  const harness = await page.request.get(baseUrl + "/__test/health");
  assert.equal(harness.status(), 200);
  assert.deepEqual(await harness.json(), {
    ok: true, database: "sqlite-memory", environment: "synthetic-only"
  });

  await page.goto(baseUrl + "/admin", { waitUntil: "networkidle" });
  assert.equal(await page.title(), "پنل مدیریت طهوری");
  assert.equal(await page.locator("#loginCard").isVisible(), true,
    "Unauthenticated visitors must see the login card.");
  assert.equal(await page.locator("#panel").isVisible(), false,
    "The admin panel must remain hidden before authentication.");
  await page.locator("#adminKey").fill("wrong-browser-test-password");
  await page.locator('[data-action="login"]').click();
  await page.locator("#loginError:not([hidden])").waitFor();
  assert.match(await page.locator("#loginError").innerText(), /رمز|نامعتبر|خطا/);

  await page.locator("#adminKey").fill(adminPassword);
  await page.locator('[data-action="login"]').click();
  await page.locator("#panel:not([hidden])").waitFor();
  assert.equal(await page.locator("#loginCard").isVisible(), false);
  await page.locator("#health").getByText("سرویس سالم").waitFor();
  await page.locator("#studentProfilesFile").waitFor();

  // Exercise the actual browser file chooser, File.text(), UI event delegation,
  // authenticated POST, server-side import, and refreshed student table.
  await page.locator("#studentProfilesFile").setInputFiles({
    name: "synthetic-student-profiles.json",
    mimeType: "application/json",
    buffer: fixtureBuffer
  });
  const firstImportResponse = page.waitForResponse(response => response.url().endsWith("/api/admin/students/import"));
  await page.locator('[data-action="importStudentsFile"]').click();
  assert.equal((await firstImportResponse).status(), 200);
  await page.waitForFunction(() => document.querySelector("#students")?.innerText.includes("synthetic-student-04"));
  await page.locator("#students").getByText("synthetic-student-01").waitFor();
  for (const id of [
    "synthetic-student-01", "synthetic-student-02",
    "synthetic-student-03", "synthetic-student-04"
  ]) {
    assert.equal(await page.locator("#students").getByText(id).count(), 1,
      "Imported student must appear exactly once: " + id);
  }
  assert.equal(await page.locator("#studentProfilesFile").inputValue(), "",
    "The UI must clear the file input after a successful import.");

  // Duplicate import must be idempotent and must not create duplicate accounts.
  await page.locator("#studentProfilesFile").setInputFiles({
    name: "synthetic-student-profiles.json",
    mimeType: "application/json",
    buffer: fixtureBuffer
  });
  const duplicateImportResponse = page.waitForResponse(response => response.url().endsWith("/api/admin/students/import"));
  await page.locator('[data-action="importStudentsFile"]').click();
  assert.equal((await duplicateImportResponse).status(), 200);
  await page.waitForFunction(() => document.querySelector("#students")?.innerText.includes("synthetic-student-04"));
  assert.ok(dialogMessages.some(message => message.includes("قبلاً ثبت‌شده: 4")), "Duplicate import must be reported as already registered.");
  const studentsResponse = await page.request.get(baseUrl + "/api/admin/students", {
    headers: { cookie: await context.cookies().then(cookies => cookies.map(c => c.name + "=" + c.value).join("; ")) }
  });
  assert.equal(studentsResponse.status(), 200);
  const studentsBody = await studentsResponse.json();
  assert.equal(studentsBody.students.length, 4, "Duplicate import must not duplicate student accounts.");
  const storedProfileOne = studentsBody.students.find(student => student.studentId === "synthetic-student-01");
  assert.ok(storedProfileOne);
  for (const field of ["totalScore", "totalActivities", "currentStreak", "settings"]) {
    assert.equal(Object.hasOwn(storedProfileOne, field), false,
      "Profile import must not transfer local game progress or settings into the license registry: " + field);
  }

  const academicYear = "1405";
  const installOne = "browser-e2e-installation-one";
  const installTwo = "browser-e2e-installation-two";

  // First profile: the selector must preserve identity and auto-fill its grade.
  await page.locator("#studentId").selectOption("synthetic-student-01");
  assert.equal(await page.locator("#grade").inputValue(), "grade6");
  await page.locator("#year").fill(academicYear);
  await page.locator("#count").fill("1");
  await page.locator('[data-action="createCodes"]').click();
  await page.locator("#newCodes:not([hidden])").waitFor();
  const codeOne = (await page.locator("#newCodes").innerText()).trim();
  assert.match(codeOne, /^THR-/);

  // Wrong student and wrong grade must be rejected without consuming the code.
  const mismatchOne = await page.evaluate(async ({ code }) => {
    const response = await fetch("/api/licenses/activate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code, gradeId: "grade6", studentId: "synthetic-student-02",
        installationId: "browser-e2e-wrong-student"
      })
    });
    return { status: response.status, body: await response.json() };
  }, { code: codeOne });
  assert.equal(mismatchOne.status, 409, "A code must not activate another student's profile.");

  const gradeMismatch = await page.evaluate(async ({ code }) => {
    const response = await fetch("/api/licenses/activate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code, gradeId: "grade5", studentId: "synthetic-student-01",
        installationId: "browser-e2e-wrong-grade"
      })
    });
    return { status: response.status, body: await response.json() };
  }, { code: codeOne });
  assert.equal(gradeMismatch.status, 400, "A code must not activate a different grade.");

  const activationOne = await page.evaluate(async ({ code, installationId }) => {
    const response = await fetch("/api/licenses/activate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code, gradeId: "grade6", studentId: "synthetic-student-01", installationId
      })
    });
    return { status: response.status, body: await response.json() };
  }, { code: codeOne, installationId: installOne });
  assert.equal(activationOne.status, 200, "The matching student and grade must activate.");
  assert.equal(activationOne.body.valid, true);
  assert.equal(activationOne.body.entitlement.claims.studentId, "synthetic-student-01");
  assert.equal(activationOne.body.entitlement.claims.gradeScope, "grade6");

  const duplicateActivation = await page.evaluate(async ({ code }) => {
    const response = await fetch("/api/licenses/activate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code, gradeId: "grade6", studentId: "synthetic-student-01",
        installationId: "browser-e2e-second-attempt"
      })
    });
    return response.status;
  }, { code: codeOne });
  assert.equal(duplicateActivation, 409, "A one-time activation code must not be reused.");

  // Switch the UI to a second student and activate a separately bound code.
  await page.locator("#studentId").selectOption("synthetic-student-02");
  assert.equal(await page.locator("#grade").inputValue(), "grade6");
  await page.locator("#count").fill("1");
  const secondCodeResponse = page.waitForResponse(response =>
    response.url().endsWith("/api/admin/codes") && response.request().method() === "POST"
  );
  await page.locator('[data-action="createCodes"]').click();
  assert.equal((await secondCodeResponse).status(), 201);
  await page.waitForFunction(previousCode =>
    document.querySelector("#newCodes")?.textContent.trim() !== previousCode,
    codeOne
  );
  const codeTwo = (await page.locator("#newCodes").innerText()).trim();
  assert.match(codeTwo, /^THR-/);
  assert.notEqual(codeTwo, codeOne);

  const mismatchTwo = await page.evaluate(async ({ code }) => {
    const response = await fetch("/api/licenses/activate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code, gradeId: "grade6", studentId: "synthetic-student-01",
        installationId: "browser-e2e-cross-profile"
      })
    });
    return response.status;
  }, { code: codeTwo });
  assert.equal(mismatchTwo, 409, "The second student's code must not activate the first profile.");

  const activationTwo = await page.evaluate(async ({ code, installationId }) => {
    const response = await fetch("/api/licenses/activate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code, gradeId: "grade6", studentId: "synthetic-student-02", installationId
      })
    });
    return { status: response.status, body: await response.json() };
  }, { code: codeTwo, installationId: installTwo });
  assert.equal(activationTwo.status, 200);
  assert.equal(activationTwo.body.entitlement.claims.studentId, "synthetic-student-02");
  assert.notEqual(
    activationOne.body.entitlement.claims.licenseId,
    activationTwo.body.entitlement.claims.licenseId,
    "Each profile must receive its own license."
  );

  const licensesResponsePromise = page.waitForResponse(response =>
    response.url().endsWith("/api/admin/licenses") && response.request().method() === "GET"
  );
  await page.locator('[data-action="loadLicenses"]').click();
  const licensesResponse = await licensesResponsePromise;
  assert.equal(licensesResponse.status(), 200);
  const licenses = (await licensesResponse.json()).licenses;
  const licenseOne = licenses.find(item => item.studentId === "synthetic-student-01");
  const licenseTwo = licenses.find(item => item.studentId === "synthetic-student-02");
  assert.ok(licenseOne && licenseTwo, "Both profiles must have separate server-side licenses.");
  assert.equal(licenseOne.licenseId, activationOne.body.entitlement.claims.licenseId);
  assert.equal(licenseTwo.licenseId, activationTwo.body.entitlement.claims.licenseId);

  // Logout must revoke the authenticated browser session.
  await page.locator('[data-action="logout"]').click();
  await page.locator("#loginCard:not([hidden])").waitFor();
  assert.equal(await page.locator("#panel").isVisible(), false);
  const expiredSessionStatus = await page.evaluate(async () =>
    (await fetch("/api/admin/session", { credentials: "include" })).status
  );
  assert.equal(expiredSessionStatus, 401, "Logout must invalidate the browser's admin session cookie.");

  // A separate mobile-sized browser context checks the real responsive page.
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mobilePage = await mobileContext.newPage();
  mobilePage.on("pageerror", error => pageErrors.push(error.message));
  mobilePage.on("dialog", dialog => dialog.accept());
  await mobilePage.goto(baseUrl + "/admin", { waitUntil: "networkidle" });
  await mobilePage.locator("#adminKey").fill(adminPassword);
  await mobilePage.locator('[data-action="login"]').click();
  await mobilePage.locator("#panel:not([hidden])").waitFor();
  const dimensions = await mobilePage.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    panelVisible: !document.getElementById("panel").hidden,
    importVisible: !!document.getElementById("studentProfilesFile").getBoundingClientRect().width
  }));
  assert.equal(dimensions.panelVisible, true);
  assert.equal(dimensions.importVisible, true);
  assert.ok(dimensions.document <= dimensions.viewport + 1,
    "Mobile admin page must not introduce horizontal overflow outside its scrollable tables.");

  assert.deepEqual(pageErrors, [], "The admin UI must not produce uncaught browser JavaScript errors.");
  console.log("Admin browser E2E: PASS");
  console.log("PASS: login, invalid password, real JSON file selection/import, duplicate import, profile listing");
  console.log("PASS: code creation, wrong-student/grade rejection, one-time activation, two-profile isolation");
  console.log("PASS: separate license records, logout/session invalidation, 390px mobile layout");
  await mobileContext.close();
  await context.close();
} catch (error) {
  console.error("Admin browser E2E: FAIL", error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
