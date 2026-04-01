# AI Interview Coach Backend

Backend service for AI Interview Coach.

## Stack

- Node.js
- Express
- MongoDB (Mongoose)
- Groq AI SDK (with local fallback)

## Setup

1. Install dependencies:
   - `npm install`
2. Create environment file:
   - copy `.env.example` to `.env`
3. Run development server:
   - `npm run dev`

## Notes

- `.env` is ignored by git.
- Keep secrets only in local environment files.
- Set `AI_PROVIDER=groq`, `GROQ_API_KEY`, `GROQ_MODEL`, and `AI_STRICT_MODE=false` to use Groq safely.
