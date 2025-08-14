// ironpaste/static/js/main.js

document.addEventListener('DOMContentLoaded', () => {
  const createBtn = document.getElementById('create-btn');
  if (createBtn) {
    createBtn.addEventListener('click', handleCreatePaste);
  }

  const pasteView = document.getElementById('paste-view');
  if (pasteView) {
    loadPaste();
  }

  const copyBtn = document.getElementById('copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
        const resultUrlInput = document.getElementById('result-url');
        const includePasswordCheckbox = document.getElementById('include-password-checkbox');
        
        if (!resultUrlInput) {
            console.error("Could not find the 'result-url' input field.");
            return;
        }

        let urlToCopy = resultUrlInput.value;

        if (includePasswordCheckbox && !includePasswordCheckbox.checked) {
            urlToCopy = urlToCopy.split('#')[0];
        }

        navigator.clipboard.writeText(urlToCopy).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.style.backgroundColor = '#27ae60';
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.backgroundColor = '#3498db';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy URL.');
        });
    });
  }
});

async function handleCreatePaste() {
  const contentInput = document.getElementById('content-input');
  const passwordInput = document.getElementById('password-input');
  const expirationSelect = document.getElementById('expiration-select');
  const burnCheckbox = document.getElementById('burn-after-reading-checkbox');
  
  const content = contentInput.value;
  const password = passwordInput.value;
  const expiration = expirationSelect.value;
  const maxReads = burnCheckbox.checked ? 1 : null;

  if (!content.trim()) {
    alert('Content cannot be empty.');
    return;
  }
  
  let contentToSend = content;
  const isEncrypted = password.length > 0;

  if (isEncrypted) {
    contentToSend = await cryptoUtils.encrypt(content, password);
  }
  
  try {
    const response = await fetch('/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: contentToSend,
        expiration: expiration === "0" ? null : parseInt(expiration, 10),
        isEncrypted: isEncrypted,
        maxReads: maxReads
      }),
    });
    
    if (!response.ok) throw new Error('Server error');

    const data = await response.json();
    const pasteId = data.id;
    
    let resultUrl = `${window.location.origin}/${pasteId}`;
    if (password) {
      resultUrl += `#${password}`;
    }

    displayResult(resultUrl, password);

  } catch (error) {
    console.error('Failed to create paste:', error);
    alert('Could not create paste. Please try again.');
  }
}

function displayResult(url, password) {
    const pasteForm = document.querySelector('.paste-form');
    const resultDiv = document.getElementById('result');
    const resultUrlInput = document.getElementById('result-url');
    const includePasswordContainer = document.getElementById('include-password-container');
    const includePasswordCheckbox = document.getElementById('include-password-checkbox');
    
    if (!pasteForm || !resultDiv || !resultUrlInput || !includePasswordContainer || !includePasswordCheckbox) {
        console.error("Critical Error: One or more UI elements for displaying the result are missing from index.html. Please check for typos in the element IDs.");
        alert("A critical error occurred. Please check the developer console (F12) for details.");
        return;
    }

    pasteForm.classList.add('hidden');
    resultDiv.classList.remove('hidden');
    resultUrlInput.value = url;

    if (password && password.length > 0) {
        includePasswordContainer.classList.remove('hidden');
        includePasswordCheckbox.checked = true;
    } else {
        includePasswordContainer.classList.add('hidden');
    }
}

async function loadPaste() {
    const pasteId = document.body.dataset.pasteId;
    if (!pasteId) return;

    const loadingState = document.getElementById('loading-state');
    const pasteContentArea = document.getElementById('paste-content-area');
    const pasteContentEl = document.getElementById('paste-content');

    try {
        const response = await fetch(`/api/get/${pasteId}`);
        if (!response.ok) {
            loadingState.textContent = 'Paste not found or has expired.';
            return;
        }
        
        const data = await response.json();
        const content = data.content;
        const isEncrypted = data.is_encrypted;

        if (!isEncrypted) {
            pasteContentEl.textContent = content;
            loadingState.classList.add('hidden');
            pasteContentArea.classList.remove('hidden');
            return;
        }
        
        const key = decodeURIComponent(window.location.hash.substring(1));

        if (key) {
            loadingState.textContent = 'Decrypting...';
            const plaintext = await cryptoUtils.decrypt(content, key);
            
            if (plaintext !== null) {
                pasteContentEl.textContent = plaintext;
                loadingState.classList.add('hidden');
                pasteContentArea.classList.remove('hidden');
            } else {
                alert('The key in the URL is incorrect. Please enter the correct password.');
                window.location.hash = '';
                showUnlockForm(content);
            }
        } else {
            showUnlockForm(content);
        }

    } catch (error) {
        console.error('Failed to load paste:', error);
        loadingState.textContent = 'An error occurred while loading the paste.';
    }
}

function showUnlockForm(encryptedContent) {
    document.getElementById('loading-state').classList.add('hidden');
    const unlockForm = document.getElementById('unlock-form');
    unlockForm.classList.remove('hidden');
    
    const unlockBtn = document.getElementById('unlock-btn');
    const unlockPasswordInput = document.getElementById('unlock-password');
    const errorMessage = document.getElementById('error-message');

    unlockBtn.addEventListener('click', async () => {
        const password = unlockPasswordInput.value;
        if (!password) return;

        const plaintext = await cryptoUtils.decrypt(encryptedContent, password);
        
        if (plaintext !== null) {
            document.getElementById('paste-content').textContent = plaintext;
            unlockForm.classList.add('hidden');
            document.getElementById('paste-content-area').classList.remove('hidden');
        } else {
            errorMessage.textContent = 'Incorrect password. Please try again.';
            errorMessage.classList.remove('hidden');
            unlockPasswordInput.focus();
        }
    });
}