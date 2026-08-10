import test from 'node:test';
import assert from 'node:assert/strict';
import { handler } from './ai-tutor-chat.js';

test('returns a fallback reply when Gemini is not configured', async () => {
  const req = {
    method: 'POST',
    body: {
      messages: [{ role: 'user', content: 'Hello' }],
      context: {},
    },
    headers: {},
  };

  let statusCode = 200;
  let payload;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(value) {
      payload = value;
      return value;
    },
    setHeader() {},
  };

  await handler(req, res);

  assert.equal(statusCode, 200);
  assert.match(payload.reply, /local fallback/i);
});
