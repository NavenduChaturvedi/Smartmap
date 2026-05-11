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
const nameField = document.getElementById("name-field");
const nameInput = document.getElementById("login-name");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const errorEl = document.getElementById("auth-error");
const submitBtn = document.getElementById("login-submit");
const toggleBtn = document.getElementById("auth-toggle-btn");
const modeHint = document.getElementById("auth-mode-hint");

let authMode = "login";

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
  submitBtn.textContent = isLoading
    ? (authMode === "login" ? "Connecting..." : "Creating Account...")
    : (authMode === "login" ? "Initialize Session" : "Create Account");
  if (toggleBtn) {
    toggleBtn.disabled = isLoading;
  }
};

const setMode = (nextMode) => {
  authMode = nextMode;
  if (submitBtn) {
    submitBtn.textContent = authMode === "login" ? "Initialize Session" : "Create Account";
  }
  if (toggleBtn) {
    toggleBtn.textContent = authMode === "login" ? "Create Account" : "Back to Login";
  }
  if (modeHint) {
    modeHint.textContent = authMode === "login"
      ? "New operatives can create an account from here."
      : "Create an account first, then use the same credentials to sign in.";
  }
  // show name input for signup mode
  if (nameField) nameField.style.display = authMode === "signup" ? "block" : "none";
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
  const displayName = nameInput?.value?.trim?.() || null;

  setError("");
  setLoading(true);

  const authResponse = authMode === "login"
    ? await supabase.auth.signInWithPassword({ email, password })
    : await supabase.auth.signUp({ email, password });

  setLoading(false);
  if (authResponse.error) {
    setError(authResponse.error.message || (authMode === "login" ? "Login failed." : "Account creation failed."));
    return;
  }

  if (authMode === "signup") {
    // If signUp returned a user object, persist display name to profiles
    const user = authResponse?.data?.user;
    if (user && displayName) {
      try {
        await supabase.from('profiles').upsert({ id: user.id, display_name: displayName, email });
      } catch (e) {
        // non-blocking
        console.warn('Failed to upsert profile:', e);
      }
    }

    if (!authResponse.data?.session) {
      setError("Account created. Check your email to confirm access, then sign in.");
      setMode("login");
      return;
    }
  }

  window.location.href = "dashboard.html";
});

toggleBtn?.addEventListener("click", () => {
  setError("");
  setMode(authMode === "login" ? "signup" : "login");
});

restoreSession();
setMode("login");
