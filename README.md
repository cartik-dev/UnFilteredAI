# UnFilteredAI

OpenAI-compatible proxy for Tooken Club.

## Model
- `gpt-5.6-luna`
- Output limit: 35,000 tokens
- Streaming: supported

## Endpoints
- `GET /v1/models`
- `POST /v1/chat/completions`

## Environment
Set `TOOKEN_CLUB_API_KEY` in Vercel Environment Variables.

The provider key must stay server-side and must never be committed to Git.

## System prompt
Edit `SYSTEM_PROMPT` in `api/chat/completions.js` when you are ready to add the instruction.

## Client example
```json
{
  "model": "gpt-5.6-luna",
  "messages": [
    { "role": "user", "content": "Привет!" }
  ],
  "stream": true,
  "max_tokens": 35000
}
```
