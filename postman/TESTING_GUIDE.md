# Bookshelf API - Postman Testing Guide

## Project Overview
**Bookshelf** is a collaborative book management system with JWT authentication, collaborative editing, and activity tracking.

### Key Features:
- **User Authentication**: Registration and JWT token-based login
- **Book Management**: CRUD operations with ownership validation
- **Collaborative Editing**: Users can request permission to edit books they don't own
- **Activity Tracking**: All user actions are logged and accessible
- **Open Library Integration**: Look up book details and covers from Open Library
- **Admin Controls**: Admins can delete all books/activity and manage permissions

---

## Setup Instructions

### 1. Start the Backend Server
From your project root, run:
```powershell
backend\mvnw.cmd -f backend\pom.xml spring-boot:run
```

The server will start on `http://localhost:8080`

Verify it's running by visiting: `http://localhost:8080/swagger-ui/index.html`

### 2. Import into Postman
1. Open Postman
2. Click **Import**
3. Choose the file: `Bookshelf_API_Postman_Collection.json`
4. Also import the environment: `Bookshelf_Postman_Environment.json`
5. In the top-right, select the **Bookshelf Local Dev** environment

---

## Complete Testing Workflow

### Phase 1: Authentication (Start Here!)
**Goal**: Create users and obtain JWT tokens

1. **Register a Test User**
   - Request: `Auth → Register User`
   - Body has default test credentials
   - Expected: `201 Created`
   - Automatically sets: `user_id`, `user_email`, `user_username`

2. **Login as Test User**
   - Request: `Auth → Login User`
   - Expected: `200 OK` with JWT token
   - Token automatically saved to `{{jwt_token}}` variable
   - Also captures `user_username` and `user_role`

3. **(Optional) Register a Second User**
   - Modify the email/username in Register request
   - Creates a second account for testing collaboration features

### Phase 2: Book Management
**Goal**: Test core CRUD operations

1. **Get All Books** (Optional - DB might be empty)
   - Request: `Books → Get All Books`
   - Expected: `200 OK` with empty array `[]` or existing books
   - If books exist, captures first book ID to `{{book_id}}`

2. **Create a Book**
   - Request: `Books → Create Book`
   - Body contains example book data (The Great Gatsby)
   - Expected: `201 Created`
   - Automatically saves `book_id` for next requests

3. **Get Book by ID**
   - Request: `Books → Get Book by ID`
   - Uses `{{book_id}}` captured earlier
   - Expected: `200 OK` with full book object

4. **Update Book**
   - Request: `Books → Update Book`
   - Modify title/genre (keep same author/year to avoid duplicates)
   - Expected: `200 OK` with updated book data
   - Note: Sets `wasEdited: true` and captures editor info

5. **Get All Books Again**
   - Request: `Books → Get All Books`
   - Expected: `200 OK` with your created/updated book
   - Test optional filters:
     - `?query=gatsby` - search by title/author
     - `?yearFrom=1900&yearTo=2000` - year range
     - `?exactYear=1925` - exact year
     - `?sortField=title&sortDirection=desc` - sort options

### Phase 3: Collaborative Editing (Requires 2 Users!)
**Goal**: Test edit requests workflow

**Prerequisites**: Must have 2 users logged in. Use separate Postman tabs or collections.

1. **User A (Book Owner)**
   - Creates a book (see Phase 2 step 2)
   - Saves `{{book_id}}`
   - Stays logged in with User A token

2. **User B (Editor)**
   - Login as different user (modify `jwt_token` to User B's token)
   - Request: `Edit Requests → Create Edit Request`
   - Expected: `201 Created` with edit request ID
   - Automatically saves `edit_request_id`

3. **User A (Back to Owner)**
   - Switch `jwt_token` back to User A
   - Request: `Edit Requests → Get Pending Edit Requests`
   - Expected: `200 OK` with User B's pending request

4. **User A Approves Request**
   - Request: `Edit Requests → Approve Edit Request`
   - Uses `{{book_id}}` and `{{edit_request_id}}`
   - Expected: `200 OK` with status: `APPROVED`

5. **User B Can Now Edit**
   - Switch to User B token
   - Request: `Books → Update Book`
   - Expected: `200 OK` (previously would have been forbidden)

### Phase 4: Activity Tracking
**Goal**: Verify all actions are logged

1. **Get Activity Feed**
   - Request: `Activity → Get Latest Activity`
   - Expected: `200 OK` with array of recent events
   - Should include: book added, book edited, edit requested, edit approved
   - Events show: `actionType`, `actor`, `description`, `createdAt`

2. **(Admin Only) Clear Activity**
   - Must be logged in as admin
   - Request: `Activity → Clear Activity`
   - Expected: `204 No Content`

### Phase 5: Open Library Integration
**Goal**: Test external API integration

1. **Search Book**
   - Request: `Open Library Integration → Search Book`
   - Query defaults to searching for "1984" by George Orwell
   - Expected: `200 OK` with book data including `coverId`
   - Automatically saves `cover_id`

2. **Get Book Cover**
   - Request: `Open Library Integration → Get Book Cover`
   - Uses `{{cover_id}}` from search
   - Expected: `200 OK` with image bytes (binary data)

### Phase 6: Advanced Filtering & Sorting
**Goal**: Test query parameter combinations

Use `Books → Get All Books` and enable various query parameters:

**Search Examples**:
- `?query=harry potter` - finds by title or author
- `?yearFrom=2000&yearTo=2010` - books published 2000-2010
- `?exactYear=2001` - only books from specific year
- `?trusted=true` - only books found online
- `?sortField=author&sortDirection=desc` - sort by author descending

---

## Error Cases to Test

### Authentication Errors
1. **Invalid Credentials**
   - Login with wrong password
   - Expected: `401 Unauthorized` with message "invalid credentials"

2. **Duplicate Email**
   - Register with same email twice
   - Expected: `409 Conflict` with message "email already registered"

3. **Missing Fields**
   - Register without username
   - Expected: `400 Bad Request` with validation error

### Book Validation Errors
1. **Missing Required Fields**
   - Create book without title/author
   - Expected: `400 Bad Request` with field errors

2. **Invalid Year**
   - Create book with year 500 or 2050
   - Expected: `400 Bad Request` - year must be 1450-2026

3. **Duplicate Book**
   - Create book with same title/author/year
   - Expected: `400 Bad Request` - duplicate not allowed

### Permission Errors
1. **Edit Book You Don't Own**
   - Create book as User A
   - Try to edit as User B (without approval)
   - Expected: `403 Forbidden` with message "forbidden"

2. **Owner Requesting Own Edit**
   - As book owner, try to create edit request for own book
   - Expected: `400 Bad Request` - "owners cannot request access"

3. **Non-Owner Managing Edit Requests**
   - Try to approve/deny requests on book you don't own
   - Expected: `403 Forbidden`

---

## Variables Reference

After running requests, these variables auto-populate:

| Variable | Captured From | Used In |
|----------|---------------|---------|
| `{{jwt_token}}` | Login response | All authenticated requests (header) |
| `{{book_id}}` | Create/Get Book | All book-specific requests |
| `{{edit_request_id}}` | Create Edit Request | Approve/Deny Edit Request |
| `{{user_id}}` | Register response | Tracking (reference only) |
| `{{user_email}}` | Register/Login response | Tracking (reference only) |
| `{{user_username}}` | Login response | Tracking (reference only) |
| `{{cover_id}}` | Open Library search | Get Book Cover |

---

## Tips for Success

1. **Always Start with Auth**
   - You MUST login before any authenticated request
   - Token expires in production, but lasts session in dev

2. **Check Variable Substitution**
   - Use `Ctrl+Alt+E` to view current environment variables
   - Verify `{{jwt_token}}` is populated before making authenticated requests

3. **Test Incrementally**
   - Run Phase 1 → Phase 2 → Phase 3, etc.
   - Don't skip authentication steps
   - Each phase depends on data from previous phase

4. **Postman Collections Tab Trick**
   - Open multiple tabs within the collection
   - Keep Auth tab open to refresh token anytime
   - Useful for simulating multi-user scenarios

5. **Read Response Bodies**
   - Errors contain helpful messages
   - Successful responses show exactly what was created/updated
   - Use this to verify state before next request

6. **Clear Data Between Test Runs**
   - Before re-testing, use `Books → Delete All Books` (if admin)
   - Or restart backend (data resets on app startup with fresh DB)

---

## Using Postman AI to Generate Test Cases

**Use this prompt in Postman's built-in AI:**

```
You have a Bookshelf API collection with the following endpoints:
- POST /api/auth/register - Create new user
- POST /api/auth/login - Get JWT token
- GET /api/books - Get all books with filters
- POST /api/books - Create book
- PUT /api/books/{id} - Update book
- DELETE /api/books/{id} - Delete book
- POST /api/books/{id}/edit-requests - Request edit permission
- GET /api/books/{id}/edit-requests - Get pending requests (owner only)
- PUT /api/books/{id}/edit-requests/{requestId}/approve - Approve request
- PUT /api/books/{id}/edit-requests/{requestId}/deny - Deny request
- GET /api/activity - Get activity log
- DELETE /api/activity - Clear activity (admin only)
- GET /api/open-library/search - Search Open Library
- GET /api/open-library/covers/{coverId} - Get book cover
- GET /api/audio/waka - Get audio file

Generate comprehensive Postman test scenarios that cover:
1. Happy path workflows (register → login → create book → edit)
2. Permission/authorization testing (owner vs non-owner)
3. Collaborative workflows (edit requests with 2+ users)
4. Edge cases (invalid year, duplicate books, missing fields)
5. Error handling (invalid credentials, 404s, 403s)

Each test should verify response status codes, response body structure, and data integrity.
```

---

## Database Info

- **Type**: H2 (in-memory with file persistence)
- **Location**: `%USERPROFILE%/.bookshelf/data`
- **Init Mode**: `never` - data persists between runs
- **To Reset**: Delete the file or restart backend

### Pre-seeded Data
Admin user created on startup:
- Email: `admin@gmail.com`
- Username: `admin`
- Password: `Admin1234`

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| 401 Unauthorized on all requests | Login first, check `{{jwt_token}}` is populated |
| 404 on book endpoints | Create a book first, capture `{{book_id}}` |
| 403 Forbidden on edit | Not the owner and no approved edit request |
| Can't modify edit request | You must be the book owner |
| Duplicate book error | Each title/author/year combo must be unique |
| Server not responding | Start backend with `mvnw.cmd -f pom.xml spring-boot:run` |
| Variable not substituting | Check syntax: `{{variable_name}}` with double braces |

---

## Next Steps After Testing

1. ✅ **Verify all endpoints respond correctly**
2. ✅ **Test error cases and edge scenarios**
3. ✅ **Validate JWT auth flow works**
4. ✅ **Confirm collaborative features (edit requests)**
5. ✅ **Check activity logging captures all events**
6. ✅ **Test Open Library integration**
7. 🚀 **Ready for integration testing with frontend!**

