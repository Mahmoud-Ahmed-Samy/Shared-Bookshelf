# 📚 Bookshelf

![Java](https://img.shields.io/badge/Java-21%2B-007396?style=flat-square&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1-6DB33F?style=flat-square&logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![H2](https://img.shields.io/badge/DB-H2%20file-336791?style=flat-square&logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)

A full-stack personal bookshelf application with JWT authentication, collaborative edit requests, real-time activity feeds, and a Netflix-dark UI. Built with Spring Boot on the backend and React + Vite on the frontend.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 Auth | Register & log in via JWT. Sessions persist across reloads. Role-based access (USER / ADMIN). |
| 📖 Book Management | Add, edit, and delete books you own. Includes title, author, genre, year, and cover art. |
| 🖼️ Cover Art | Automatic cover fetching via the Open Library Covers API. Manual URL also supported. |
| 🔍 Search & Filter | Live search by title, author, genre, owner, or ID. Filter by year range, exact year, verified, or ownership. |
| 🔄 Sort | Sort by title, author, year, genre, or date added — ascending or descending. |
| 🤝 Edit Requests | Non-owners can request edit access. Owners approve or deny. Admins bypass this flow. |
| 📡 Activity Feed | Real-time sidebar feed of all shelf activity (adds, edits, deletes, approvals). |
| ⭐ Star Ratings | Rate any book 1–5 stars. Ratings are stored per-user in the browser. |
| 📖 Reading Status | Tag books as Want to Read / Reading / Finished. Filterable. |
| 📝 Personal Notes | Add a private note to any book, saved locally per user. |
| 📊 Stats Bar | Live counts of total books, your books, unique genres, and verified entries. |
| ↓ Export | Download the current library view as a JSON file. |
| 🔗 Book Deep Links | Copy a direct `?book=<id>` URL to any card; opening it scrolls and highlights that book. |
| ⌨️ Keyboard Shortcuts | `/` focuses search, `?` opens the shortcut modal. |
| 🎵 Ambient Music | Synthesised ambient chord loop via Web Audio API — no files to host. |
| 🛡️ Security | Brute-force login protection, JWT expiry, CORS config, Spring Security. |

---

## 🗂️ Project Structure

```
bookshelf/
├── backend/                    # Spring Boot API
│   ├── src/main/java/com/bookshelf/
│   │   ├── config/             # Security & bootstrap
│   │   ├── controller/         # REST endpoints
│   │   ├── entity/             # JPA entities
│   │   ├── repository/         # Spring Data repos
│   │   ├── security/           # JWT filter & handlers
│   │   ├── service/            # Business logic
│   │   └── integration/        # Open Library client
│   └── src/main/resources/
│       ├── application.properties
│       ├── schema.sql
│       └── data.sql
├── frontend/                   # React + Vite SPA
│   └── src/
│       ├── components/
│       │   ├── LoginPage.jsx   # Full-screen auth page
│       │   ├── BookList.jsx
│       │   ├── BookForm.jsx
│       │   ├── BookFormModal.jsx
│       │   ├── BookFilters.jsx
│       │   ├── ActivityFeed.jsx
│       │   ├── StatsBar.jsx
│       │   ├── StarRating.jsx
│       │   ├── ReadingStatus.jsx
│       │   ├── BookNote.jsx
│       │   └── KeyboardHelp.jsx
│       ├── App.jsx             # Root component + auth gate
│       ├── api.js              # All API calls
│       ├── music.js            # Web Audio ambient loop
│       └── netflix.css         # Global styles
├── bookshelf-tests/            # TestNG integration tests
├── postman/                    # Postman collection & environment
│   ├── Bookshelf_API_Postman_Collection.json
│   ├── Bookshelf_Postman_Environment.json
│   ├── TESTING_GUIDE.md
│   └── QUICK_REFERENCE.md
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| Java | 21+ |
| Maven | Bundled via `mvnw` |
| Node.js | 18+ |
| npm | 9+ |

### 1 — Start the backend

```bash
cd backend
./mvnw spring-boot:run       # Linux / macOS
mvnw.cmd spring-boot:run     # Windows
```

The API starts at **`http://localhost:8080`**.  
Swagger UI: **`http://localhost:8080/swagger-ui/index.html`**

The default admin account is seeded on first run:
- **Email:** `admin@gmail.com`
- **Password:** `Admin1234`

> **Data persists** across restarts in an H2 file database at `%USERPROFILE%/.bookshelf/data` (Windows) or `~/.bookshelf/data` (Unix).

### 2 — Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The app opens at **`http://localhost:5173`**.

---

## 🔑 Authentication Flow

1. Visit the app — you are shown the full-screen **Login / Register** page.
2. Register a new account or log in with existing credentials.
3. JWT is stored in `localStorage` and sent with every API request.
4. Sessions expire automatically; the app redirects you back to the login page.

---

## 📡 API Overview

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Register a new user |
| `POST` | `/api/auth/login` | — | Login, returns JWT |
| `GET` | `/api/books` | — | List / search / filter books |
| `POST` | `/api/books` | ✅ | Create a book |
| `PUT` | `/api/books/{id}` | ✅ | Update a book |
| `DELETE` | `/api/books/{id}` | ✅ | Delete a book |
| `POST` | `/api/books/{id}/edit-requests` | ✅ | Request edit access |
| `GET` | `/api/books/{id}/edit-requests` | ✅ Owner/Admin | List pending requests |
| `PUT` | `/api/books/{id}/edit-requests/{rid}/approve` | ✅ Owner/Admin | Approve request |
| `PUT` | `/api/books/{id}/edit-requests/{rid}/deny` | ✅ Owner/Admin | Deny request |
| `GET` | `/api/activity` | — | Recent activity feed |
| `GET` | `/api/open-library/search` | — | Search Open Library |

Full interactive docs at **`/swagger-ui/index.html`** when the backend is running.

---

## 🧪 Running Tests

### Backend unit tests

```bash
cd backend
./mvnw test          # Linux / macOS
mvnw.cmd test        # Windows
```

### Integration tests (TestNG)

The test suite auto-starts the backend if it isn't already running:

```bash
cd bookshelf-tests
../backend/mvnw.cmd -f pom.xml test   # Windows
../backend/mvnw -f pom.xml test       # Linux / macOS
```

Reports are written to `bookshelf-tests/target/surefire-reports/`.

### Postman

Import the collection and environment from `postman/` into Postman, then run the **Bookshelf API Suite**.

---

## ⚙️ Configuration

### Backend (`backend/src/main/resources/application.properties`)

| Property | Default | Description |
|---|---|---|
| `jwt.secret` | `bookshelf-local-dev-secret-key-change-me-2026` | JWT signing secret — override in production |
| `jwt.expiration.ms` | `3600000` | Token lifetime in milliseconds |
| `spring.datasource.url` | H2 file path | Swap to PostgreSQL URL for production |
| `bookshelf.admin.email` | `admin@gmail.com` | Bootstrap admin email |
| `bookshelf.admin.password` | `Admin1234` | **Change this in production** |

### Frontend (`frontend/src/api.js`)

The `API_BASE_URL` defaults to `http://localhost:8080/api`. For a deployed environment, create a `frontend/.env` file:

```env
VITE_API_BASE_URL=https://your-api-host.com/api
```

---

## 🏗️ Tech Stack

**Backend**
- Java 17, Spring Boot 3, Spring Security, Spring Data JPA
- H2 (dev) / PostgreSQL (prod)
- JWT (JJWT), Lombok, SpringDoc OpenAPI (Swagger)

**Frontend**
- React 18, Vite 5
- Vanilla CSS (Netflix-dark design system)
- Open Library Covers API

**Testing**
- TestNG, Rest-Assured

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
