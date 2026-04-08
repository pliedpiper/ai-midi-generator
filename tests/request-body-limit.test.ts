import { describe, expect, it } from 'vitest';
import { parseJsonBodyWithLimit } from '@/lib/api/request';

type RequestInitWithDuplex = RequestInit & {
  duplex: 'half';
};

const makeStreamRequest = (body: string) => {
  const init: RequestInitWithDuplex = {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        const midpoint = Math.ceil(body.length / 2);

        controller.enqueue(encoder.encode(body.slice(0, midpoint)));
        controller.enqueue(encoder.encode(body.slice(midpoint)));
        controller.close();
      }
    }),
    duplex: 'half'
  };

  return new Request('http://localhost/api/test', init);
};

describe('parseJsonBodyWithLimit', () => {
  it('parses a streamed JSON body within the byte limit', async () => {
    const req = makeStreamRequest(JSON.stringify({ prompt: 'short motif' }));

    const result = await parseJsonBodyWithLimit<{ prompt: string }>(req, 100);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ prompt: 'short motif' });
    }
  });

  it('rejects a streamed JSON body that exceeds the byte limit without content-length', async () => {
    const req = makeStreamRequest(
      JSON.stringify({ prompt: 'x'.repeat(256) })
    );

    const result = await parseJsonBodyWithLimit<{ prompt: string }>(req, 100);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(413);
      await expect(result.response.json()).resolves.toEqual({ error: 'Request body too large.' });
    }
  });
});
