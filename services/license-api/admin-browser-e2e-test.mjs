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
  page.on("dialog", dialog => dialog.accept());

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
  const duplicateImportDialog = page.waitForEvent("dialog");
  await page.locator('[data-action="importStudentsFile"]').click();
  assert.equal((await duplicateImportResponse).status(), 200);
  const duplicateDialog = await duplicateImportDialog;
  assert.match(duplicateDialog.message(), /قبلاً ثبت‌شده:\s*4/,
    "Duplicate import must report all four profiles as already registered.");
  await page.waitForFunction(() => document.querySelector("#students")?.innerText.includes("synthetic-student-04"));
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

  // Add two isolated synthetic accounts, then exercise the actual JSON-file bulk issuance UI.
  const bulkProfiles = [
    { studentId: "synthetic-bulk-01", fullName: "پروفایل گروهی یک", gradeId: "grade2" },
    { studentId: "synthetic-bulk-02", fullName: "پروفایل گروهی دو", gradeId: "grade4" }
  ];
  const bulkImport = await page.evaluate(async profiles => {
    const response = await fetch("/api/admin/students/import", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profiles })
    });
    return { status: response.status, body: await response.json() };
  }, bulkProfiles);
  assert.equal(bulkImport.status, 200);
  assert.equal(bulkImport.body.imported, 2);
  const bulkFileBuffer = Buffer.from(JSON.stringify({
    format: "tahouri-student-profiles", version: 1, profiles: bulkProfiles
  }));
  await page.locator("#bulkProfilesFile").setInputFiles({
    name: "synthetic-bulk-profiles.json", mimeType: "application/json", buffer: bulkFileBuffer
  });
  const bulkIssueResponse = page.waitForResponse(response =>
    response.url().endsWith("/api/admin/codes/bulk") && response.request().method() === "POST"
  );
  await page.locator('[data-action="createBulkCodesFromFile"]').click();
  const bulkIssue = await bulkIssueResponse;
  assert.equal(bulkIssue.status(), 201, "The authenticated browser UI must issue a batch of student-bound codes.");
  const bulkIssueBody = await bulkIssue.json();
  assert.equal(bulkIssueBody.count, 2);
  assert.equal(bulkIssueBody.codes.length, 2);
  assert.equal(bulkIssueBody.codes.find(item => item.studentId === "synthetic-bulk-01").gradeId, "grade2");
  assert.equal(bulkIssueBody.codes.find(item => item.studentId === "synthetic-bulk-02").gradeId, "grade4");
  const bulkCodeText = await page.locator("#bulkNewCodes").innerText();
  assert.match(bulkCodeText, /THR-GRADE2-/);
  assert.match(bulkCodeText, /THR-GRADE4-/);
  assert.equal(await page.locator("#bulkProfilesFile").inputValue(), "",
    "The bulk file input must be cleared after successful one-time code display.");

  const academicYear = "1405";
  const installOne = "browser-e2e-installation-one";
  // Reuse one browser-generated RSA identity and sign every activation request.
  await page.evaluate(async () => {
    const temporaryPair = await crypto.subtle.generateKey(
      { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
      true, ["sign", "verify"]
    );
    const publicDer = new Uint8Array(await crypto.subtle.exportKey("spki", temporaryPair.publicKey));
    const privateDer = await crypto.subtle.exportKey("pkcs8", temporaryPair.privateKey);
    const privateKey = await crypto.subtle.importKey(
      "pkcs8", privateDer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
    );
    const publicBase64 = btoa(Array.from(publicDer, byte => String.fromCharCode(byte)).join(""));
    const publicLines = publicBase64.match(/.{1,64}/g).join("\n");
    const publicKeyPem = "-----BEGIN PUBLIC KEY-----\n" + publicLines + "\n-----END PUBLIC KEY-----";
    window.__makeActivationPayload = async ({ code, gradeId, studentId, installationId }) => {
      const normalizedCode = String(code).trim().toUpperCase();
      const codeDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalizedCode));
      const codeHash = Array.from(new Uint8Array(codeDigest), byte => byte.toString(16).padStart(2, "0")).join("");
      const deviceType = "computer";
      const proof = JSON.stringify({
        purpose: "tahouri-device-activation-v1",
        installationId, deviceType, studentId, gradeId, codeHash
      });
      const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(proof)
      );
      const signatureBase64 = btoa(Array.from(new Uint8Array(signature), byte => String.fromCharCode(byte)).join(""));
      return { code: normalizedCode, gradeId, studentId, installationId, deviceType,
        devicePublicKeyPem: publicKeyPem, deviceSignature: signatureBase64 };
    };
  });
  // All three synthetic children intentionally share this one device installation.

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
      body: JSON.stringify(await window.__makeActivationPayload({ code, gradeId: "grade6", studentId: "synthetic-student-02", installationId: "browser-e2e-wrong-student" }))
    });
    return { status: response.status, body: await response.json() };
  }, { code: codeOne });
  assert.equal(mismatchOne.status, 409, "A code must not activate another student's profile.");

  const gradeMismatch = await page.evaluate(async ({ code }) => {
    const response = await fetch("/api/licenses/activate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await window.__makeActivationPayload({ code, gradeId: "grade5", studentId: "synthetic-student-01", installationId: "browser-e2e-wrong-grade" }))
    });
    return { status: response.status, body: await response.json() };
  }, { code: codeOne });
  assert.equal(gradeMismatch.status, 400, "A code must not activate a different grade.");

  const activationOne = await page.evaluate(async ({ code, installationId }) => {
    const response = await fetch("/api/licenses/activate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await window.__makeActivationPayload({ code, gradeId: "grade6", studentId: "synthetic-student-01", installationId }))
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
      body: JSON.stringify(await window.__makeActivationPayload({ code, gradeId: "grade6", studentId: "synthetic-student-01", installationId: "browser-e2e-second-attempt" }))
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
      body: JSON.stringify(await window.__makeActivationPayload({ code, gradeId: "grade6", studentId: "synthetic-student-01", installationId: "browser-e2e-cross-profile" }))
    });
    return response.status;
  }, { code: codeTwo });
  assert.equal(mismatchTwo, 409, "The second student's code must not activate the first profile.");

  const activationTwo = await page.evaluate(async ({ code, installationId }) => {
    const response = await fetch("/api/licenses/activate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await window.__makeActivationPayload({ code, gradeId: "grade6", studentId: "synthetic-student-02", installationId }))
    });
    return { status: response.status, body: await response.json() };
  }, { code: codeTwo, installationId: installOne });
  assert.equal(activationTwo.status, 200);
  assert.equal(activationTwo.body.entitlement.claims.studentId, "synthetic-student-02");
  assert.equal(activationTwo.body.entitlement.claims.installationBinding, installOne,
    "The second child must be allowed to use the same device installation.");
  assert.notEqual(
    activationOne.body.entitlement.claims.licenseId,
    activationTwo.body.entitlement.claims.licenseId,
    "Each profile must receive its own license."
  );

  // Third child: a different grade and profile must also activate on the same device.
  await page.locator("#studentId").selectOption("synthetic-student-03");
  assert.equal(await page.locator("#grade").inputValue(), "grade5");
  await page.locator("#count").fill("1");
  const thirdCodeResponse = page.waitForResponse(response =>
    response.url().endsWith("/api/admin/codes") && response.request().method() === "POST"
  );
  await page.locator('[data-action="createCodes"]').click();
  assert.equal((await thirdCodeResponse).status(), 201);
  await page.waitForFunction(previousCode =>
    document.querySelector("#newCodes")?.textContent.trim() !== previousCode,
    codeTwo
  );
  const codeThree = (await page.locator("#newCodes").innerText()).trim();
  assert.match(codeThree, /^THR-/);
  assert.notEqual(codeThree, codeTwo);

  const activationThree = await page.evaluate(async ({ code, installationId }) => {
    const response = await fetch("/api/licenses/activate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await window.__makeActivationPayload({ code, gradeId: "grade5", studentId: "synthetic-student-03", installationId }))
    });
    return { status: response.status, body: await response.json() };
  }, { code: codeThree, installationId: installOne });
  assert.equal(activationThree.status, 200,
    "A third child with a separate profile and grade must activate on the same device.");
  assert.equal(activationThree.body.entitlement.claims.studentId, "synthetic-student-03");
  assert.equal(activationThree.body.entitlement.claims.gradeScope, "grade5");
  assert.equal(activationThree.body.entitlement.claims.installationBinding, installOne);
  assert.equal(new Set([
    activationOne.body.entitlement.claims.licenseId,
    activationTwo.body.entitlement.claims.licenseId,
    activationThree.body.entitlement.claims.licenseId
  ]).size, 3, "Three children on one device must receive three distinct licenses.");

  const licensesResponsePromise = page.waitForResponse(response =>
    response.url().endsWith("/api/admin/licenses") && response.request().method() === "GET"
  );
  await page.locator('[data-action="loadLicenses"]').click();
  const licensesResponse = await licensesResponsePromise;
  assert.equal(licensesResponse.status(), 200);
  const licenses = (await licensesResponse.json()).licenses;
  const licenseOne = licenses.find(item => item.studentId === "synthetic-student-01");
  const licenseTwo = licenses.find(item => item.studentId === "synthetic-student-02");
  const licenseThree = licenses.find(item => item.studentId === "synthetic-student-03");
  assert.ok(licenseOne && licenseTwo && licenseThree,
    "All three profiles must have separate server-side licenses.");
  assert.equal(licenseOne.licenseId, activationOne.body.entitlement.claims.licenseId);
  assert.equal(licenseTwo.licenseId, activationTwo.body.entitlement.claims.licenseId);
  assert.equal(licenseThree.licenseId, activationThree.body.entitlement.claims.licenseId);

  // Exercise emergency recovery in the browser using synthetic-only harness data.
  const seeded = await page.request.post(baseUrl + "/__test/seed-recovery", { data: { licenseId: licenseOne.licenseId } });
  assert.equal(seeded.status(), 200);
  await page.locator("#recoveryLicenseId").fill(licenseOne.licenseId);
  await page.locator("#recoveryDeviceType").selectOption("phone");
  await page.locator("#recoveryInstallationId").fill("synthetic-phone-installation");
  await page.locator("#recoveryFingerprint").fill("synthetic-phone-fingerprint");
  await page.locator("#recoveryReason").fill("Synthetic browser recovery verification");
  await page.locator("#recoveryAdminPassword").fill(adminPassword);
  const recoveryResponsePromise = page.waitForResponse(response =>
    response.url().endsWith("/api/admin/device-slots/recover") && response.request().method() === "POST"
  );
  await page.locator('[data-action="recoverDeviceSlot"]').click();
  const recoveryResponse = await recoveryResponsePromise;
  assert.equal(recoveryResponse.status(), 200, "The admin recovery form must call the protected endpoint.");
  assert.equal((await recoveryResponse.json()).status, "revoked");
  assert.equal(await page.locator("#recoveryAdminPassword").inputValue(), "",
    "The admin password field must be cleared after recovery.");
  const stateResponse = await page.request.get(baseUrl + "/__test/recovery-state?licenseId=" + encodeURIComponent(licenseOne.licenseId));
  assert.equal(stateResponse.status(), 200);
  const recoveryState = await stateResponse.json();
  assert.ok(recoveryState.slots.find(slot => slot.deviceType === "phone")?.revokedAt,
    "The exact phone slot must be revoked.");
  assert.equal(recoveryState.slots.find(slot => slot.deviceType === "computer")?.revokedAt, null,
    "The complementary computer slot must remain active.");
  assert.ok(recoveryState.pairing?.cancelledAt, "Pending pairing requests must be cancelled.");
  assert.equal(recoveryState.auditCount, 1, "Recovery must be audited exactly once.");

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
  console.log("PASS: code creation, wrong-student/grade rejection, one-time activation");
  console.log("PASS: three children, three separate licenses, one shared device installation");
  console.log("PASS: logout/session invalidation, 390px mobile layout");
  await mobileContext.close();
  await context.close();
} catch (error) {
  console.error("Admin browser E2E: FAIL", error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
