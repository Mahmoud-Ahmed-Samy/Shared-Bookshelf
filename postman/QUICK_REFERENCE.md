# 🚀 Bookshelf API - Quick Postman Checklist

## Setup (5 minutes)

- [ ] Backend running: `backend\mvnw.cmd -f backend\pom.xml spring-boot:run`
- [ ] Verify: `http://localhost:8080/swagger-ui/index.html` loads
- [ ] Import collection: `Bookshelf_API_Postman_Collection.json`
- [ ] Import environment: `Bookshelf_Postman_Environment.json`
- [ ] Select environment: "Bookshelf Local Dev" (top-right dropdown)

---

## Test Sequence

### Phase 1: Auth ✅
```
1. POST /api/auth/register          → 201 (user created)
2. POST /api/auth/login             → 200 (token saved)
```

### Phase 2: Books ✅
```
3. GET /api/books                   → 200 (list books)
4. POST /api/books                  → 201 (create book, id saved)
5. GET /api/books/{id}              → 200 (fetch book)
6. PUT /api/books/{id}              → 200 (update book)
7. DELETE /api/books/{id}           → 204 (delete book)
```

### Phase 3: Filters & Search ✅
```
8. GET /api/books?query=gatsby              → 200 (search works)
9. GET /api/books?yearFrom=1900&yearTo=2000 → 200 (year range works)
10. GET /api/books?sortField=author&sortDirection=desc → 200 (sort works)
```

### Phase 4: Edit Requests (Needs 2 Users!) ✅
```
11. Register User B          → 201
12. Login User B             → 200 (get token for user B)
13. User B: POST /api/books/{id}/edit-requests  → 201 (request created)
14. User A: GET /api/books/{id}/edit-requests   → 200 (see request)
15. User A: PUT .../edit-requests/{id}/approve  → 200 (approved)
16. User B: PUT /api/books/{id}                 → 200 (can now edit!)
```

### Phase 5: Activity ✅
```
17. GET /api/activity           → 200 (events logged)
```

### Phase 6: Open Library ✅
```
18. GET /api/open-library/search?title=1984 → 200 (book found)
19. GET /api/open-library/covers/{coverId}  → 200 (cover image)
```

### Phase 7: Error Cases ✅
```
20. POST /api/auth/login (wrong password)       → 401 ✓
21. POST /api/books (no title)                  → 400 ✓
22. POST /api/books (duplicate)                 → 400 ✓
23. PUT /api/books/{id} (not owner, no approval) → 403 ✓
```

---

## Key Variables (Auto-Captured)

| Variable | How It's Set | Example |
|----------|-------------|---------|
| `{{jwt_token}}` | Login response | From step 2 |
| `{{book_id}}` | Create book response | From step 4 |
| `{{edit_request_id}}` | Create edit request | From step 13 |
| `{{user_email}}` | Register response | test@example.com |
| `{{user_username}}` | Login response | testuser |

**Use in URLs**: `GET /api/books/{{book_id}}`
**Use in Headers**: `Authorization: Bearer {{jwt_token}}`

---

## Common Gotchas ⚠️

| Problem | Fix |
|---------|-----|
| 401 Unauthorized | Did you login? Check {{jwt_token}} is populated |
| 404 on /api/books/{id} | Create a book first, use returned ID |
| 403 Forbidden on edit | Only owner can edit (unless they approved your request) |
| Duplicate book error | title + author + year must be unique |
| Variable not substituting | Use double braces: `{{name}}` |
| Server won't respond | Is it running? Check `localhost:8080/swagger-ui` |

---

## Admin User (Pre-seeded)

```
Email: admin@gmail.com
Password: Admin1234
Role: ADMIN (can delete all books/activity)
```

---

## Postman AI Magic ✨

Once all manual tests pass, use Postman AI:

1. Click **Postman AI** (sparkle icon, top-right)
2. Paste the prompt from `POSTMAN_AI_PROMPT.md`
3. AI generates comprehensive test scenarios:
   - Happy paths ✅
   - Error cases ✅
   - Permission tests ✅
   - Multi-user workflows ✅
   - Edge cases ✅
4. Run generated tests
5. All green? 🟢 **Ready for frontend integration!**

---

## Files Location

```
Desktop/bookshelf/
├── Bookshelf_API_Postman_Collection.json     ← Import this
├── Bookshelf_Postman_Environment.json        ← Import this
├── POSTMAN_TESTING_GUIDE.md                  ← Read detailed steps
├── POSTMAN_AI_PROMPT.md                      ← Paste into Postman AI
└── POSTMAN_QUICK_REFERENCE.md                ← You are here
```

---

## Expected Responses

### Success Examples
```json
POST /api/auth/login → 200
{
  "token": "eyJhbGc...",
  "username": "testuser",
  "role": "USER"
}

POST /api/books → 201
{
  "id": 1,
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "year": 1925,
  "wasEdited": false,
  "ownerEmail": "test@example.com",
  "ownerUsername": "testuser"
}

GET /api/books → 200
[
  { "id": 1, "title": "...", "author": "...", ... }
]
```

### Error Examples
```json
POST /api/auth/login (wrong password) → 401
{
  "message": "invalid credentials"
}

POST /api/books (no title) → 400
{
  "title": "is required"
}

PUT /api/books/1 (not owner) → 403
{
  "message": "forbidden"
}
```

---

## Success Criteria ✅

- [ ] All auth endpoints return correct status codes
- [ ] JWT token works on protected endpoints
- [ ] Can create, read, update, delete books
- [ ] Search and filters work correctly
- [ ] Edit request workflow allows approved users to edit
- [ ] Permission checks prevent unauthorized edits
- [ ] Activity events are logged for all actions
- [ ] Open Library integration returns book data
- [ ] Error responses have helpful messages
- [ ] Variables auto-populate for chained requests

**When all boxes are checked → API is ready! 🚀**

---

## Next: Frontend Integration

Once Postman testing is 100% complete:
1. Frontend is at `/frontend/` (Vite + React)
2. API calls from frontend should use `http://localhost:8080/api/...`
3. Token stored in localStorage
4. Frontend uses same environment: dev, staging, prod

**See `POSTMAN_TESTING_GUIDE.md` for detailed step-by-step instructions!**

