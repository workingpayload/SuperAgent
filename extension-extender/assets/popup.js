document.addEventListener('DOMContentLoaded', () => {
  const actionBtn = document.getElementById('actionBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const statusMsg = document.getElementById('statusMsg');

  actionBtn.addEventListener('click', async () => {
    statusMsg.textContent = 'Running action...';
    actionBtn.disabled = true;
    
    // Example: Query the active tab
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        statusMsg.textContent = `Active tab: ${tab.title.substring(0, 15)}...`;
      } else {
        statusMsg.textContent = 'No active tab found.';
      }
    } catch (error) {
      statusMsg.textContent = 'Error executing action.';
      console.error(error);
    } finally {
      setTimeout(() => {
        actionBtn.disabled = false;
        statusMsg.textContent = 'Ready';
      }, 2000);
    }
  });

  settingsBtn.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });
});