const toggle = document.getElementById("redirect-shorts");
const status = document.getElementById("status");
let savedValue = true;

chrome.storage.local.get({ redirectShorts: true }).then((settings) => {
  savedValue = settings.redirectShorts !== false;
  toggle.checked = savedValue;
  toggle.disabled = false;
  status.textContent = "";
}).catch(() => {
  status.textContent = "Could not load settings. Reopen the popup to try again.";
});

toggle.addEventListener("change", async () => {
  toggle.disabled = true;
  status.textContent = "Saving…";
  try {
    await chrome.storage.local.set({ redirectShorts: toggle.checked });
    savedValue = toggle.checked;
    status.textContent = "Saved. Applies to open tabs too.";
  } catch {
    toggle.checked = savedValue;
    status.textContent = "Could not save. Please try again.";
  } finally {
    toggle.disabled = false;
  }
});
