const waitForSupabase = (timeoutMs = 2000) => new Promise((resolve) => {
  const start = Date.now();
  const tick = () => {
    if (window.AegisSupabase) return resolve(window.AegisSupabase);
    if (Date.now() - start >= timeoutMs) return resolve(null);
    setTimeout(tick, 50);
  };
  tick();
});
const form = document.getElementById("login-form");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const errorEl = document.getElementById("auth-error");
const submitBtn = document.getElementById("login-submit");

const setError = (message) => {
  if (!errorEl) return;
  if (!message) {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
    return;
  }
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
};

const setLoading = (isLoading) => {
  if (!submitBtn) return;
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? "Connecting..." : "Initialize Session";
};

const restoreSession = async () => {
  const supabase = await waitForSupabase();
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  if (data?.session?.user) {
    window.location.href = "dashboard.html";
  }
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const supabase = await waitForSupabase();
  if (!supabase) {
    setError("Supabase client not ready. Check configuration.");
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  setError("");
  setLoading(true);

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  setLoading(false);
  if (error) {
    setError(error.message || "Login failed.");
    return;
  }

  window.location.href = "dashboard.html";
});

restoreSession();
