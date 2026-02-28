# Bitespeed Identity Reconciliation

A backend web service that identifies and keeps track of a customer's identity across multiple purchases using different contact information.

## 🚀 Live Endpoint

```
POST https://bitespeed-task-gamma.vercel.app/identify
```


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
curl -X POST https://bitespeed-task-gamma.vercel.app/identify \
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
- **Hosting:** Vercel

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

## 🌐 Deployment on Vercel

1. **Database:** Create a free PostgreSQL database on [Neon.tech](https://neon.tech) and copy the connection string.
2. **Vercel:** Create a new project on [Vercel](https://vercel.com) and connect your GitHub repository.
3. **Environment Variables:** Add `DATABASE_URL` with your Neon connection string in the Vercel project settings.
4. **Deploy:** Click deploy. Vercel will automatically build the API and run Prisma database push using the provided `vercel-build` script.


## 📝 Identity Reconciliation Logic

- If no matching contact exists → create a **new primary** contact
- If a match is found but new info is provided → create a **secondary** contact linked to the primary
- If two separate primary groups are linked by new info → the **older** primary wins; the newer one is demoted to secondary
