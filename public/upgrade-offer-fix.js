// Temporary compatibility fix for the dashboard trial-upgrade path.
// app.js currently defines appendUpgradeOffer inside addMessage, so the
// dashboard cannot see it when the 10-minute trial expires. Expose a safe
// global implementation without changing the diagnostic exemption.
window.appendUpgradeOffer = function appendUpgradeOffer(message) {
  const chat = document.querySelector("#chat");
  if (!chat) return;

  const messageEl = document.createElement("div");
  messageEl.className = "message assistant";
  messageEl.innerHTML = "<strong>Tolux Coach</strong><p></p>";
  messageEl.querySelector("p").textContent =
    message ||
    "You've completed your 10-minute free learning trial. Upgrade to continue with Tolux AI Math Coach.";
  chat.appendChild(messageEl);

  const upgradeBtn = document.createElement("button");
  upgradeBtn.type = "button";
  upgradeBtn.textContent = "Upgrade Now";
  upgradeBtn.className = "upgrade-btn";
  upgradeBtn.addEventListener("click", () => {
    const planButton = document.querySelector("#studentPlanBtn");
    if (planButton) {
      planButton.click();
      return;
    }
    document.querySelector("#pricingSection")?.scrollIntoView({ behavior: "smooth" });
  });

  chat.appendChild(upgradeBtn);
  chat.scrollTop = chat.scrollHeight;
};
