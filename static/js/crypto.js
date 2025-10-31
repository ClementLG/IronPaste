// ironpaste/static/js/crypto.js

// This file handles client-side encryption and decryption using the Web Crypto API.

const cryptoUtils = {
  // Converts a string to an ArrayBuffer.
  // Converts a Uint8Array to a base64 string.
  uint8ArrayToBase64(arr) {
    return btoa(String.fromCharCode.apply(null, arr));
  },

  // Converts a base64 string to a Uint8Array.
  base64ToUint8Array(b64) {
    const byteString = atob(b64);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      bytes[i] = byteString.charCodeAt(i);
    }
    return bytes;
  },

  /**
   * Derives a cryptographic key from a password using PBKDF2.
   * @param {string} password The user-provided password.
   * @param {Uint8Array} salt A random salt.
   * @returns {Promise<CryptoKey>} A key suitable for AES-GCM.
   */
  async getKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  },

  /**
   * Encrypts a given plaintext string with a password.
   * @param {string} plaintext The text to encrypt.
   * @param {string} password The password to use for encryption.
   * @returns {Promise<string>} A base64-encoded string containing salt, IV, and ciphertext.
   */
  async encrypt(plaintext, password) {
    const enc = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await this.getKey(password, salt);

    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      enc.encode(plaintext)
    );

    const encryptedBytes = new Uint8Array(encryptedContent);
    const fullMessage = new Uint8Array(salt.length + iv.length + encryptedBytes.length);
    fullMessage.set(salt);
    fullMessage.set(iv, salt.length);
    fullMessage.set(encryptedBytes, salt.length + iv.length);
    
    return this.uint8ArrayToBase64(fullMessage);
  },

  /**
   * Decrypts a cyphertext using a password.
   * @param {string} encryptedB64 The base64-encoded encrypted data.
   * @param {string} password The password for decryption.
   * @returns {Promise<string|null>} The decrypted plaintext, or null if decryption fails.
   */
  async decrypt(encryptedB64, password) {
    try {
      const fullMessage = this.base64ToUint8Array(encryptedB64);
      
      const salt = fullMessage.slice(0, 16);
      const iv = fullMessage.slice(16, 28);
      const data = fullMessage.slice(28);

      const key = await this.getKey(password, new Uint8Array(salt));

      const decryptedContent = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        key,
        data
      );

      const dec = new TextDecoder();
      return dec.decode(decryptedContent);
    } catch (e) {
      console.error("Decryption failed:", e);
      return null;
    }
  },
};