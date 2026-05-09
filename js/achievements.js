  const filterButtons = document.querySelectorAll(".achievement-filter");
  const achievementCards = document.querySelectorAll(".achievement-card");
  const modal = document.getElementById("achievement-modal");
  const modalClose = document.getElementById("achievement-modal-close");
  const modalTitle = document.getElementById("achievement-modal-title");
  const modalRarity = document.getElementById("achievement-modal-rarity");
  const modalDescription = document.getElementById("achievement-modal-description");
  const modalXp = document.getElementById("achievement-modal-xp");
  const unlockedCountEl = document.getElementById("vault-unlocked-count");
  const totalCountEl = document.getElementById("vault-total-count");
  const commanderNameEl = document.getElementById("commander-name");
  const commanderXpEl = document.getElementById("commander-xp");

  const renderSummary = () => {
    const state = window.Aegis.state;
    const profileName = (state.profile?.displayName || "Commander").toUpperCase().replace(/\s+/g, "_");
    const totalXp = Number(state.totalXp || 4250);
    const tasks = state.tasks || [];
    const completedTasks = tasks.filter((task) => task.done).length;

    commanderNameEl.textContent = `COMMANDER_${profileName}`;
    commanderXpEl.textContent = `${totalXp.toLocaleString()} XP`;

    // Dynamic vault completion based on unlocked (non-locked) cards.
    const unlockedCards = Array.from(achievementCards).filter((card) => card.dataset.rarity !== "locked");
    const dynamicUnlocked = Math.min(unlockedCards.length, Math.max(4, completedTasks + 2));
    unlockedCountEl.textContent = String(dynamicUnlocked);
    totalCountEl.textContent = String(achievementCards.length + 18);
  };

  const setActiveFilter = (filter) => {
    filterButtons.forEach((button) => {
      const isActive = button.dataset.filter === filter;
      button.classList.toggle("border-primary", isActive);
      button.classList.toggle("bg-primary/10", isActive);
      button.classList.toggle("text-primary", isActive);
      button.classList.toggle("border-outline-variant", !isActive);
      button.classList.toggle("text-on-surface-variant", !isActive);
    });
  };

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      setActiveFilter(filter);
      achievementCards.forEach((card) => {
        const matches = filter === "all" || card.dataset.rarity === filter;
        card.classList.toggle("hidden", !matches);
      });
    });
  });

  achievementCards.forEach((card) => {
    card.addEventListener("click", () => {
      modalTitle.textContent = card.dataset.title || "Achievement";
      modalRarity.textContent = (card.dataset.rarity || "common").toUpperCase();
      modalDescription.textContent = card.dataset.description || "No description available.";
      modalXp.textContent = card.dataset.xp || "+0 XP";
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    });
  });

  renderSummary();
  window.addEventListener("aegis:state-updated", renderSummary);

  const closeModal = () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  };

  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });