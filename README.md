# Bitespeed Identity Reconciliation

A backend web service that identifies and keeps track of a customer's identity across multiple purchases using different contact information.

## 🚀 Live Endpoint

```
POST https://<your-render-url>/identify
```

> **Note:** Replace `<your-render-url>` with your Render deployment URL after deploying.

## 📖 API Documentation

### `POST /identify`

Accepts a JSON body with optional `email` and/or `phoneNumber` fields and returns a consolidated contact identity.

**Request Body:**
```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["primary@email.com", "secondary@email.com"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [23]
  }
}
```

### Example

**Request:**
```bash
curl -X POST https://<your-render-url>/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "mcfly@hillvalley.edu", "phoneNumber": "123456"}'
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [23]
  }
}
```

## ⚙️ Tech Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL (via Prisma ORM)
- **Hosting:** Render.com

## 🛠️ Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Steps

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd bitespeed-identity-reconciliation
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and set your DATABASE_URL
   ```

4. **Run database migrations:**
   ```bash
   npx prisma migrate dev
   ```

5. **Start the dev server:**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`.

## 🌐 Deployment on Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repository
3. Set environment variables:
   - `DATABASE_URL` — your PostgreSQL connection string
   - `NODE_ENV=production`
4. Set **Build Command:** `npm install && npx prisma generate && npm run build`
5. Set **Start Command:** `npm start`

Render provides a free PostgreSQL database — create one and copy its connection string.

## 📝 Identity Reconciliation Logic

- If no matching contact exists → create a **new primary** contact
- If a match is found but new info is provided → create a **secondary** contact linked to the primary
- If two separate primary groups are linked by new info → the **older** primary wins; the newer one is demoted to secondary
