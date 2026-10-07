// "Get help" form, shared by every page. Submissions go to the Cloudflare
// Worker, which saves each one to the private GitHub leads repo.
const LEADS_ENDPOINT = "https://paid-to-care-leads.paidtocare.workers.dev";
const FALLBACK_EMAIL = "derekdesouza6@gmail.com";
// Where doulas forward their MassHealth application package.
const HELP_EMAIL = "derekdesouza6@gmail.com";

(function () {
  const mount = document.getElementById("leadform");
  if (!mount) return;
  const defaultRole = mount.dataset.role || "";
  const opt = (v, t) => `<option value="${v}"${v === defaultRole ? " selected" : ""}>${t}</option>`;

  mount.innerHTML = `
  <form class="lead" novalidate>
    <div class="f2">
      <label>Your name<input name="name" autocomplete="name" required maxlength="100"></label>
      <label>Email<input name="email" type="email" autocomplete="email" required maxlength="200"></label>
    </div>
    <div class="f2">
      <label>I am a…<select name="role" required>
        <option value="" disabled${defaultRole ? "" : " selected"}>Choose one</option>
        ${opt("doula", "Doula")}${opt("recovery_coach", "Recovery coach")}${opt("organization", "Organization / training program")}${opt("other", "Other")}
      </select></label>
      <label>Where are you in the process?<select name="stage">
        <option value="">Choose one (optional)</option>
        <option value="just_starting">Just starting</option>
        <option value="took_training">Finished my training</option>
        <option value="applied_waiting">Applied and waiting</option>
        <option value="enrolled">Already enrolled</option>
        <option value="other">Something else</option>
      </select></label>
    </div>
    <label>What's slowing you down?<textarea name="message" rows="3" maxlength="2000" placeholder="e.g. I finished the training but can't find my certificate"></textarea></label>
    <div class="f2">
      <label>Phone (optional)<input name="phone" type="tel" autocomplete="tel" maxlength="30"></label>
      <label>Best way to reach you<select name="contact_pref"><option value="email">Email</option><option value="phone">Phone call</option><option value="text">Text</option></select></label>
    </div>
    ${mount.hasAttribute("data-offer-help") ? `<label class="check"><input type="checkbox" name="wants_help"> I'd like free one-on-one help with my MassHealth paperwork.</label>` : ""}
    <label class="hp" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
    <label class="check"><input type="checkbox" name="consent" required> It's OK to contact me about this. I won't include my Social Security number or client information.</label>
    <button class="btn" type="submit">Send</button>
    <p class="form-msg" role="status" aria-live="polite"></p>
  </form>`;

  const form = mount.querySelector("form");
  const msg = form.querySelector(".form-msg");
  const show = (text, ok) => { msg.textContent = text; msg.className = "form-msg " + (ok ? "ok" : "bad"); };

  // "Request free help" buttons tick the help box and move focus to the form.
  document.querySelectorAll("[data-wants-help]").forEach(b => b.addEventListener("click", () => {
    if (form.wants_help) form.wants_help.checked = true;
    setTimeout(() => form.name.focus({ preventScroll: true }), 50);
  }));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    if (!d.name.trim()) return show("Please add your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) return show("Please add a valid email.");
    if (!d.role) return show("Please choose doula, recovery coach or another option.");
    if (!form.consent.checked) return show("Please check the box so we can contact you.");

    const btn = form.querySelector("button");
    btn.disabled = true; btn.textContent = "Sending…";
    try {
      const r = await fetch(LEADS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...d, consent: true, wants_help: !!(form.wants_help && form.wants_help.checked), page: location.pathname.split("/").pop() || "index.html" }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "error");
      const wantedHelp = !!(form.wants_help && form.wants_help.checked);
      form.reset();
      if (wantedHelp) {
        form.style.display = "none";
        const next = document.createElement("div");
        next.className = "next-steps";
        next.innerHTML = `<h3>Thanks! Here's what happens next</h3>
          <ol>
            <li><b>Within 2 days</b>, we'll email you a short agreement and a few questions about your training and contact details. Nothing sensitive.</li>
            <li><b>Once you have your NPI number</b>, request your application package from MassHealth. It takes about 2 minutes: <a href="https://masshealth.ehs.state.ma.us/ProviderSelfService/Home/ApplicationRequest/" target="_blank" rel="noopener">MassHealth's request form</a>.</li>
            <li><b>When MassHealth emails you the package</b>, forward that email to <b>${HELP_EMAIL}</b>.</li>
            <li>We fill in your forms and send them back for you to review, sign and mail.</li>
          </ol>
          <p>Questions anytime: ${HELP_EMAIL}</p>`;
        mount.appendChild(next);
        next.scrollIntoView({ behavior: "instant", block: "start" });
      } else {
        show("Thanks! We got your message and will get back to you soon.", true);
      }
    } catch (err) {
      show(`Sorry, that didn't go through. Please email us at ${FALLBACK_EMAIL}.`);
    } finally {
      btn.disabled = false; btn.textContent = "Send";
    }
  });
})();
