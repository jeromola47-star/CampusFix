# CampusFix

University maintenance and service request management system for MIT 8333 (Advanced Web Application Development).

- **Frontend:** React 18, Vite, React Router 6, Axios, Vitest and Testing Library
- **Backend:** Node.js, Express, Sequelize, JWT, bcrypt, express-validator, Multer, Helmet, Swagger UI, Jest and Supertest
- **Database:** SQLite locally, PostgreSQL in production (same code, chosen by `DATABASE_URL`)

```
CampusFix/
  backend/    REST API (src/, tests/)
  frontend/   React app (src/pages, src/components, src/__tests__)
  tools/      build_submission_pdf.py
  screenshots/  put your real screenshots here
```

Requirements: Node.js 18 or newer (check with `node --version`).

## 1. Run it locally

**Backend** (terminal 1):

```bash
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
npm start                   # API on http://localhost:5000, docs on http://localhost:5000/api/docs
```

On first start the server creates the tables, the 3 roles, the 6 categories and the administrator from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` (default `admin@campusfix.edu` / `Admin@12345`).

**Frontend** (terminal 2):

```bash
cd frontend
npm install
cp .env.example .env
npm run dev                 # http://localhost:5173
```

**Optional demo data** (makes every screen look populated for screenshots). Run once after the server has started:

```bash
cd backend
npm run seed:demo
```

| Role | Email | Password |
|---|---|---|
| Administrator | admin@campusfix.edu | Admin@12345 (or your ADMIN_PASSWORD) |
| Maintenance Officer | ola@campusfix.edu | Officer@123 |
| Student / Staff | ada@campusfix.edu | Student@123 |

If `npm install` fails on `bcrypt` (rare, usually a Node version issue), install `bcryptjs` instead and change `require('bcrypt')` to `require('bcryptjs')` in `backend/src/utils/helpers.js` and `backend/src/routes/auth.js`.

## 2. Run the tests

```bash
cd backend && npm test      # expect: 22 passed
cd frontend && npm test     # expect: 7 passed
```

Take your Figure 14 and 15 screenshots from these terminal outputs. If any test fails, read the message: do not edit the report to say "all passed" until they do.

## 3. Deploy

### Database (Neon, Render or Railway PostgreSQL)
Create a PostgreSQL database and copy its connection URL.

### Backend (Render or Railway web service)
- Root directory: `backend`, build command: `npm install`, start command: `npm start`
- Environment variables: `DATABASE_URL` (the URL above), `DB_SSL=true`, `JWT_SECRET` (long random string), `CLIENT_URL` (your frontend URL, filled in after step below), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`
- After deploy, open `https://YOUR-BACKEND/api/health` and `https://YOUR-BACKEND/api/docs`.

### Frontend (Vercel or Netlify)
- Root directory: `frontend`, build command: `npm run build`, output directory: `dist`
- Environment variable: `VITE_API_URL=https://YOUR-BACKEND` (no trailing slash)
- Then go back to the backend and set `CLIENT_URL` to the frontend URL, and redeploy the backend.
- `vercel.json` and `public/_redirects` already make page refreshes work.

### Verify the database connection
On the live site register, log in, submit a request, then check it appears in the admin dashboard. That proves the deployed version reads and writes the database.

Note: free hosts often wipe uploaded files when the service restarts. For permanent images switch `backend/src/middleware/upload.js` to Cloudinary or S3. Mention this honestly in the report if it affects you.

## 4. Screenshots to take (match the figure numbers in the report)

| Fig | Screen | How to get it |
|---|---|---|
| 1 | Swagger docs | Open `/api/docs` on the deployed backend |
| 2 | Registration with validation | Open Register, submit with a weak password and wrong confirmation |
| 3 | Login page | `/login` |
| 4 | Student dashboard | Log in as the student |
| 5 | Submission form | New request page, filled in, with a photo chosen |
| 6 | Tracking page | Open a request that has a photo and several status changes |
| 7 | Officer dashboard | Log in as the officer |
| 8 | Officer updating progress | Open an assigned job, show the Update progress panel |
| 9 | Admin dashboard | Summary counts plus the officer dropdown |
| 10 | Search and filter | Type a search word and pick a status filter |
| 11 | Notifications | Notifications page with unread items |
| 12 | User management | `/users` as admin |
| 13 | Audit log | `/audit` as admin |
| 14 | Backend tests | Terminal after `npm test` in `backend` |
| 15 | Frontend tests | Terminal after `npm test` in `frontend` |
| 16 | Live application | Browser showing the deployed URL |
| 17 | Hosting dashboard | Backend service and database in Render/Neon/Railway |

Use a browser window at a normal desktop size, and hide or blur anything private (connection strings, secrets).

## 5. Build the single submission PDF

1. In Word, fill in the report placeholders, insert your screenshots at each figure, then File > Save As > PDF.
2. Save your screenshots in `screenshots/` (see the file-name tip in that folder).
3. Run:

```bash
pip install reportlab pypdf pillow
python tools/build_submission_pdf.py --report CampusFix-Project-Report.pdf --out CampusFix-Submission.pdf
```

The result contains the code listing, then the screenshots, then the report, as the brief requires. `.env` files are never included, only `.env.example`.

## API summary
See the table in Section 7 of the report, or the live Swagger page at `/api/docs`.
