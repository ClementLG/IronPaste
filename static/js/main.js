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

  const copyDecryptedBtn = document.getElementById('copy-decrypted-btn');
  if (copyDecryptedBtn) {
    copyDecryptedBtn.addEventListener('click', () => {
      const pasteContent = document.getElementById('paste-content');
      if (pasteContent) {
        navigator.clipboard.writeText(pasteContent.textContent).then(() => {
          const originalText = copyDecryptedBtn.textContent;
          copyDecryptedBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyDecryptedBtn.textContent = originalText;
          }, 2000);
        }).catch(err => {
          console.error('Failed to copy text: ', err);
          alert('Failed to copy content.');
        });
      }
    });
  }

  const deleteBtn = document.getElementById('delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      const password = prompt('To delete this paste, please re-enter the password:');
      if (password) {
        deletePaste(password);
      }
    });
  }

  const generatePasswordBtn = document.getElementById('generate-password-btn');
  if (generatePasswordBtn) {
    generatePasswordBtn.addEventListener('click', handleGeneratePassword);
  }

  const togglePasswordVisibilityBtn = document.getElementById('toggle-password-visibility');
  if (togglePasswordVisibilityBtn) {
    togglePasswordVisibilityBtn.addEventListener('click', handleTogglePasswordVisibility);
  }

  const passwordInput = document.getElementById('password-input');
  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      const noPasswordWarning = document.getElementById('no-password-warning');
      if (passwordInput.value.length > 0) {
        noPasswordWarning.classList.add('is-hidden');
      }
    });
  }
});

async function handleCreatePaste() {
  const contentInput = document.getElementById('content-input');
  const passwordInput = document.getElementById('password-input');
  const expirationSelect = document.getElementById('expiration-select');
  const burnCheckbox = document.getElementById('burn-after-reading-checkbox');
  const languageSelect = document.getElementById('language-select');
  const noPasswordWarning = document.getElementById('no-password-warning');

  const content = contentInput.value;
  const password = passwordInput.value;
  const expiration = expirationSelect.value;
  const maxReads = burnCheckbox.checked ? 1 : null;
  const language = languageSelect.value;

  if (!content.trim()) {
    alert('Content cannot be empty.');
    return;
  }

  if (password.length === 0) {
    noPasswordWarning.classList.remove('is-hidden');
    const userConfirmed = confirm('You have not set a password. The content will not be encrypted. Do you want to continue?');
    if (!userConfirmed) {
      return;
    }
  } else {
    noPasswordWarning.classList.add('is-hidden');
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
        maxReads: maxReads,
        language: language
      }),
    });
    
    if (!response.ok) throw new Error('Server error');

    const data = await response.json();
    const pasteId = data.id;
    
    const resultUrl = `${window.location.origin}/${pasteId}`;
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
    const passwordWarning = document.getElementById('password-warning');

    if (!pasteForm || !resultDiv || !resultUrlInput || !includePasswordContainer || !includePasswordCheckbox || !passwordWarning) {
        console.error("Critical Error: One or more UI elements for displaying the result are missing from index.html.");
        alert("A critical error occurred. Please check the developer console (F12) for details.");
        return;
    }

    if (pasteForm) pasteForm.classList.add('is-hidden');
    if (resultDiv) resultDiv.classList.remove('is-hidden');
    resultUrlInput.value = url;

    if (password && password.length > 0) {
        includePasswordContainer.classList.remove('is-hidden');
        includePasswordCheckbox.checked = false; // Default to not including password
        passwordWarning.classList.add('is-hidden');

        includePasswordCheckbox.addEventListener('change', () => {
            if (includePasswordCheckbox.checked) {
                resultUrlInput.value = `${url}#${password}`;
                passwordWarning.classList.remove('is-hidden');
            } else {
                resultUrlInput.value = url;
                passwordWarning.classList.add('is-hidden');
            }
        });
    } else {
        includePasswordContainer.classList.add('is-hidden');
    }
}

async function loadPaste() {
    const pasteId = document.body.dataset.pasteId;
    if (!pasteId) return;

    const loadingState = document.getElementById('loading-state');
    const pasteDisplay = document.getElementById('paste-display');
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
        const isHighlighted = data.is_highlighted;

        if (!isEncrypted) {
            if (isHighlighted) {
                pasteContentEl.innerHTML = content;
            } else {
                pasteContentEl.innerHTML = '<pre>' + escapeHtml(content) + '</pre>';
            }
            loadingState.classList.add('is-hidden');
            pasteDisplay.classList.remove('is-hidden');
            return;
        }
        
        const key = decodeURIComponent(window.location.hash.substring(1));

        if (key) {
            loadingState.textContent = 'Decrypting...';
            const plaintext = await cryptoUtils.decrypt(content, key);
            
            if (plaintext !== null) {
                pasteContentEl.innerHTML = '<pre>' + escapeHtml(plaintext) + '</pre>';
                loadingState.classList.add('is-hidden');
                pasteDisplay.classList.remove('is-hidden');
                document.getElementById('delete-btn').classList.remove('is-hidden');
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
    document.getElementById('loading-state').classList.add('is-hidden');
    const unlockForm = document.getElementById('unlock-form');
    unlockForm.classList.remove('is-hidden');
    
    const unlockBtn = document.getElementById('unlock-btn');
    const unlockPasswordInput = document.getElementById('unlock-password');
    const errorMessage = document.getElementById('error-message');

    unlockBtn.addEventListener('click', async () => {
        const password = unlockPasswordInput.value;
        if (!password) return;

        const plaintext = await cryptoUtils.decrypt(encryptedContent, password);
        
        if (plaintext !== null) {
            document.getElementById('paste-content').innerHTML = '<pre>' + escapeHtml(plaintext) + '</pre>';
            unlockForm.classList.add('is-hidden');
            document.getElementById('paste-display').classList.remove('is-hidden');
            document.getElementById('delete-btn').classList.remove('is-hidden');
        } else {
            errorMessage.textContent = 'Incorrect password. Please try again.';
            errorMessage.classList.remove('is-hidden');
            unlockPasswordInput.focus();
        }
    });
}

async function deletePaste(password) {
  const pasteId = document.body.dataset.pasteId;
  if (!pasteId) {
    alert('Could not delete paste. Missing ID.');
    return;
  }

  // We need to re-verify the password by attempting to decrypt the content with it.
  // First, fetch the encrypted content again.
  const contentResponse = await fetch(`/api/get/${pasteId}`);
  if (!contentResponse.ok) {
      alert('Could not verify password. Paste may have been deleted or expired.');
      return;
  }
  const data = await contentResponse.json();
  const encryptedContent = data.content;

  const plaintext = await cryptoUtils.decrypt(encryptedContent, password);

  if (plaintext === null) {
      alert('Incorrect password. Deletion failed.');
      return;
  }

  // If decryption is successful, proceed with deletion.
  try {
    const response = await fetch(`/api/delete/${pasteId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      const notification = document.createElement('div');
      notification.className = 'notification is-success';
      notification.textContent = 'Paste has been successfully deleted.';
      document.body.innerHTML = ''; // Clear the body
      document.body.appendChild(notification);
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } else {
      throw new Error('Failed to delete the paste.');
    }
  } catch (error) {
    console.error('Deletion failed:', error);
    alert('An error occurred while deleting the paste.');
  }
}

function escapeHtml(text) {
    const map = {
        '&': '&',
        '<': '<',
        '>': '>',
        '"': '"',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function generateRandomPassword(length) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.";
    let password = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        password += charset.charAt(Math.floor(Math.random() * n));
    }
    return password;
}

function handleGeneratePassword() {
    const passwordInput = document.getElementById('password-input');
    const passwordLength = parseInt(document.body.dataset.randomPasswordLength, 10);
    passwordInput.value = generateRandomPassword(passwordLength);
}

function handleTogglePasswordVisibility() {
    const passwordInput = document.getElementById('password-input');
    const icon = document.querySelector('#toggle-password-visibility i');
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = "password";
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}