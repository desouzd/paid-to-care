// Free-help questionnaire. Saves answers to the private leads repo via the Worker.
// Never collects SSN, tax ID, date of birth, bank or client information.
(function () {
  const ENDPOINT = "https://paid-to-care-leads.paidtocare.workers.dev";
  // Show the practice-address fields only when it differs from the mailing address.
  const pslToggle = () => { const box = document.querySelector(".psl-fields"); if (box) box.hidden = document.querySelector("[name=psl_same]").value !== "no"; };
  const SSN_LIKE = /\b\d{3}[-\s.]?\d{2}[-\s.]?\d{4}\b/;
  const form = document.querySelector("form.intake");
  if (!form) return;
  form.psl_same.addEventListener("change", pslToggle); pslToggle();
  // Show follow-up sections only when they apply.
  const sectionToggle = () => {
    document.querySelector(".group-fields").hidden = !["group", "both"].includes(form.practice_type.value);
    document.querySelector(".rec-fields").hidden = form.pathway.value !== "experience";
    document.querySelector(".training-fields").hidden = form.pathway.value === "experience";
  };
  form.practice_type.addEventListener("change", sectionToggle);
  form.pathway.addEventListener("change", sectionToggle);
  sectionToggle();
  const msg = form.querySelector(".form-msg");
  const show = (t) => { msg.textContent = t; msg.className = "form-msg bad"; };

  // Warn immediately if anything looks like a Social Security / tax ID number.
  form.addEventListener("input", (e) => {
    const el = e.target;
    if (!el.name || /^(phone|fax|npi|zip|psl_zip|date_of_birth|group_npi|training_hours)$/.test(el.name)) return;
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
      if (!/^(phone|fax|npi|zip|psl_zip|date_of_birth|group_npi|training_hours)$/.test(k) && SSN_LIKE.test(v)) return show("Please remove anything that looks like a Social Security or tax ID number.");
    }
    const missing = [["first_name", "first name"], ["last_name", "last name"], ["email", "email"], ["phone", "phone"],
      ["street", "mailing address"], ["city", "city"], ["state", "state"], ["zip", "ZIP code"], ["pathway", "proof of training"], ["esign", "your typed name"]]
      .filter(([k]) => !(d[k] || "").trim()).map(([, l]) => l);
    if (!(d.date_of_birth || "").trim()) missing.push("date of birth");
    if (missing.length) return show("Please fill in: " + missing.join(", ") + ".");
    const STATES = /^(MA|MASS|MASSACHUSETTS|NH|RI|CT|NY|VT|ME)$/i;
    if (STATES.test(d.city.trim())) return show("Please enter your town or city in the City box (for example, Lawrence), not the state.");
    if (d.psl_same === "no" && STATES.test((d.psl_city || "").trim())) return show("Please enter the practice location's town or city, not the state.");
    if (d.phone.replace(/\D/g, "").length < 10) return show("Please enter your full 10-digit phone number.");
    if (!/^\d{5}(-?\d{4})?$/.test(d.zip.trim())) return show("Please check your ZIP code (5 digits).");
    if (d.group_npi && d.group_npi.replace(/\D/g, "").length !== 10) return show("The group NPI should be 10 digits, or leave it blank.");
    if (d.psl_same === "no" && !(d.psl_street && d.psl_city && d.psl_zip)) return show("Please fill in your practice location's street, city and ZIP.");
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
