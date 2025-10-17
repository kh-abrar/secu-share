# 🔐 SecureShare – File Sharing Platform

SecureShare is a privacy-first, end-to-end encrypted file-sharing web application. It allows users to securely upload, share, and download files with fine-grained access control. The platform supports public and user-specific sharing, expiration links.

---

## 🚀 Features

### ✅ Core Functionalities

- **Authentication**
  - JWT-based signup/login system using email & password
  - Session management with protected routes (`/api/auth/me`)

- **File Upload & Storage**
  - Upload files from authenticated users
  - Secure file storage on AWS S3 (via signed URLs)

- **Secure Sharing**
  - Generate shareable download links with:
    - Optional expiry time
    - Access control (public or user-specific)
    - One-time access or unlimited downloads

- **Access Control**
  - Share files publicly or with specific registered users
  - Only authorized users can view/download private files



  ## 🧰 Tech Stack
| Layer        | Tech Used                                   |
|--------------|---------------------------------------------|
| **Frontend** | React, Tailwind CSS                         |
| **Backend**  | Node.js, Express.js                         |
| **Database** | MongoDB (Mongoose ODM)                      |
| **Storage**  | AWS S3                                      |
| **Auth**     | JWT, bcrypt                                 |
| **AI**       | OpenAI API (document summarization)         |
| **Deployment** | Render / Railway / AWS                    |
