# IronPaste

IronPaste is a simple and secure web application for sharing text and code, also known as a "pastebin". It emphasizes data privacy and security through client-side end-to-end encryption.

## How It Works

The application allows users to create "pastes" (pieces of text or code) that can be shared via a unique URL. Key features include:

*   **Client-Side Encryption**: Pastes can be encrypted in the browser before being sent to the server. The server only stores the encrypted data, which means that no one without the password can read the content.
*   **Automatic Expiration**: Pastes can be configured to expire after a certain amount of time or after a certain number of reads.
*   **Syntax Highlighting**: For code pastes, syntax highlighting is automatically applied for better readability.
*   **Simple API**: A simple RESTful API is available for creating and retrieving pastes.

## Security

Security is a fundamental aspect of IronPaste. Here are the main security measures implemented:

*   **End-to-End Encryption**: Encryption is performed in the user's browser using the Web Crypto API (AES-256-GCM). The encryption key is derived from the user's password (using PBKDF2 with 100,000 iterations) and is never sent to the server.
*   **Content Security Policy (CSP)**: A strict Content Security Policy is enforced to prevent cross-site scripting (XSS) attacks.
*   **Forced HTTPS**: In production, the application can be configured to force the use of HTTPS for all communications.
*   **HTML Sanitization**: The generated HTML content (for syntax highlighting) is sanitized to prevent XSS attacks.

## Installation with Docker

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/ClementLG/IronPaste.git
    cd IronPaste
    ```

2.  **Configure environment variables:**
    Create a `.env` file in the project root and configure the following variables:
    ```
    FLASK_CONFIG=production
    SECRET_KEY=a_very_long_and_random_secret_key
    ```

3.  **Launch the application:**
    ```bash
    docker-compose up -d
    ```
    The application will be accessible at `http://localhost:5000`.

### Configuration Variables

The application's behavior is controlled by the following environment variables, defined in `config.py`:

*   `FLASK_CONFIG`: The configuration profile to use (`development` or `production`). Defaults to `development`.
*   `SECRET_KEY`: A secret key used by Flask to sign sessions and other security-related data. **It is crucial to set a long, random, and secret key in production.**
*   `DATABASE_URL`: The URL for the database. If not set, a local SQLite database (`pastes.db`) will be created inside the container.
*   `FORCE_HTTPS`: If set to `True` in production, redirects all HTTP traffic to HTTPS.

## License

This project is licensed under the GPLv3 License. See the [LICENSE](LICENSE) file for more details.
