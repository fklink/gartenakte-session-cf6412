'use strict';

let deferredInstallPrompt = null;

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function showIosInstallHelp() {
  alert('Auf dem iPhone in Safari: Teilen-Symbol antippen und anschließend „Zum Home-Bildschirm“ wählen.');
}

async function installApp() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    updateInstallButton();
    return;
  }

  if (isIos()) {
    showIosInstallHelp();
    return;
  }

  alert('Öffne das Browser-Menü und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.');
}

function updateInstallButton() {
  const buttons = document.querySelectorAll('.install-app-btn');

  buttons.forEach(button => {
    if (isStandalone()) {
      button.hidden = true;
      return;
    }

    button.hidden = false;
    button.onclick = installApp;
  });
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallButton();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  updateInstallButton();
});

window.addEventListener('DOMContentLoaded', () => {
  updateInstallButton();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(error => {
      console.warn('Service Worker konnte nicht registriert werden:', error);
    });
  }
});
