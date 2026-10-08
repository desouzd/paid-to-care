// Free-help questionnaire. Saves answers to the private leads repo via the Worker.
// Never collects SSN, tax ID, date of birth, bank or client information.
(function () {
  const ENDPOINT = "https://paid-to-care-leads.paidtocare.workers.dev";
  const SSN_LIKE = /\b\d{3}[-\s.]?\d{2}[-\s.]?\d{4}\b/;
  const form = document.querySelector("form.intake");
  if (!form) return;
  const msg = form.querySelector(".form-msg");
  const show = (t) => { msg.textContent = t; msg.className = "form-msg bad"; };

  // Warn immediately if anything looks like a Social Security / tax ID number.
  form.addEventListener("input", (e) => {
    const el = e.target;
    if (!el.name || /^(phone|npi|zip)$/.test(el.name)) return;
    const bad = SSN_LIKE.test(el.value || "");
    el.setCustomValidity(bad ? "Please don't enter Social Security or tax ID numbers." : "");
    el.classList.toggle("sensitive", bad);
    if (bad) show("That looks like a Social Security or tax ID number. Please remove it. We never collect those.");
    else if (msg.textContent.startsWith("That looks like")) msg.textContent = "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    for (const [k, v] of Object.entries(d)) {
      if (!/^(phone|npi|zip)$/.test(k) && SSN_LIKE.test(v)) return show("Please remove anything that looks like a Social Security or tax ID number.");
    }
    const missing = [["first_name", "first name"], ["last_name", "last name"], ["email", "email"], ["phone", "phone"],
      ["street", "mailing address"], ["city", "city"], ["state", "state"], ["zip", "ZIP code"], ["pathway", "proof of training"], ["esign", "your typed name"]]
      .filter(([k]) => !(d[k] || "").trim()).map(([, l]) => l);
    if (missing.length) return show("Please fill in: " + missing.join(", ") + ".");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) return show("Please check your email address.");
    const npi = (d.npi || "").replace(/\D/g, "");
    if (npi && npi.length !== 10) return show("Your NPI number should be 10 digits, or leave it blank.");
    if (!form.agree.checked) return show("Please check the box to agree to the free help agreement.");

    const btn = form.querySelector("button");
    btn.disabled = true; btn.textContent = "Submitting…";
    try {
      const r = await fetch(ENDPOINT, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...d, type: "intake", agree: true }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "error");
      form.hidden = true;
      const done = document.getElementById("intake-done");
      done.hidden = false;
      done.scrollIntoView({ behavior: "instant", block: "start" });
    } catch (err) {
      show(err.message && err.message.startsWith("Please") || (err.message || "").startsWith("It looks")
        ? err.message : "Sorry, that didn't go through. Please try again, or email paidtocarema@gmail.com.");
      btn.disabled = false; btn.textContent = "Submit questionnaire";
    }
  });
})();
