const state = window.Aegis.state;

  const displayNameInput = document.getElementById("display-name-input");
  const emailInput = document.getElementById("email-input");
  const saveProfileBtn = document.getElementById("save-profile-btn");
  const darkBtn = document.getElementById("theme-dark-btn");
  const lightBtn = document.getElementById("theme-light-btn");
  const fontSizeRange = document.getElementById("font-size-range");
  const fontSizeLabel = document.getElementById("font-size-label");
  const storageSizeLabel = document.getElementById("local-storage-size");
  const scanlineLayer = document.querySelector(".scanlines");
  const toggleButtons = document.querySelectorAll("[data-toggle]");

  const applyTheme = (theme) => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    darkBtn.classList.toggle("bg-white", theme === "dark");
    darkBtn.classList.toggle("text-background", theme === "dark");
    lightBtn.classList.toggle("bg-white", theme === "light");
    lightBtn.classList.toggle("text-background", theme === "light");
  };

  const applyFontScale = (scale) => {
    document.documentElement.style.fontSize = `${scale}%`;
    fontSizeRange.value = String(scale);
    fontSizeLabel.textContent = scale < 97 ? "Small" : scale > 108 ? "Large" : "Medium";
  };

  const applyToggleVisual = (button, enabled) => {
    const knob = button.querySelector("div");
    button.classList.toggle("bg-white/10", !enabled);
    button.classList.toggle("bg-white/25", enabled);
    knob.classList.toggle("right-1", enabled);
    knob.classList.toggle("left-1", !enabled);
  };

  const updateStorageSize = () => {
    const bytes = new Blob([localStorage.getItem(AEGIS_STORAGE_KEY) || ""]).size;
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    storageSizeLabel.textContent = `${mb} MB / 10 MB`;
  };

  displayNameInput.value = state.profile.displayName;
  emailInput.value = state.profile.email;
  applyTheme(state.settings.theme);
  applyFontScale(state.settings.fontScale);
  scanlineLayer.style.display = state.settings.scanlines ? "block" : "none";
  toggleButtons.forEach((button) => applyToggleVisual(button, !!state.settings[button.dataset.toggle]));
  updateStorageSize();

  saveProfileBtn.addEventListener("click", () => {
    state.profile.displayName = displayNameInput.value.trim() || defaultState.profile.displayName;
    state.profile.email = emailInput.value.trim() || defaultState.profile.email;
    window.Aegis.save();
    updateStorageSize();
    saveProfileBtn.textContent = "Saved";
    setTimeout(() => { saveProfileBtn.textContent = "Save Changes"; }, 1200);
  });

  darkBtn.addEventListener("click", () => {
    state.settings.theme = "dark";
    applyTheme("dark");
    window.Aegis.save();
    updateStorageSize();
  });

  lightBtn.addEventListener("click", () => {
    state.settings.theme = "light";
    applyTheme("light");
    window.Aegis.save();
    updateStorageSize();
  });

  fontSizeRange.addEventListener("input", () => {
    state.settings.fontScale = Number(fontSizeRange.value);
    applyFontScale(state.settings.fontScale);
    window.Aegis.save();
    updateStorageSize();
  });

  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.toggle;
      state.settings[key] = !state.settings[key];
      if (key === "scanlines") scanlineLayer.style.display = state.settings[key] ? "block" : "none";
      applyToggleVisual(button, state.settings[key]);
      window.Aegis.save();
      updateStorageSize();
    });
  });