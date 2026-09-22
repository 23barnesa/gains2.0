# GainLog Coach backend

Vercel serverless endpoint for secure AI coaching. The browser sends a limited, structured slice of GainLog history to `POST /api/coach`; the server calls the OpenAI Responses API.

Required Vercel environment variable:

- `OPENAI_API_KEY` — server-side secret, enabled for Production (and Preview if desired)

Optional variables:

- `OPENAI_MODEL` — defaults to `gpt-5.6-luna`
- `ALLOWED_ORIGINS` — comma-separated origins, defaults to `https://23barnesa.github.io`

Never put the OpenAI key in `/docs`, browser JavaScript, localStorage, or a committed environment file.

Production project name: `gainlog-coach-23barnesa`. Set the project root directory to `backend` when importing the repository into Vercel.
