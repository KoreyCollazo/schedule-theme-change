const { ipcRenderer } = require("electron");

document.addEventListener('DOMContentLoaded', () => {
  const themeAutoButton = document.getElementById('themeAutomationButton');

  if (themeAutoButton) {
    themeAutoButton.addEventListener('click', () => {
      // Send a message to the main process to render themeAutomation.html
      ipcRenderer.send('renderThemeAutomation');
    });
  }
});

window.loadThemeAutomation = function() {
    ipcRenderer.send('renderThemeAutomation')
};