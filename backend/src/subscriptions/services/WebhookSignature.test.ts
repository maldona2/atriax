import crypto from 'crypto';
import { WebhookHandler } from './WebhookHandler.js';

describe('Mercado Pago webhook signature validation', () => {
  it('uses the lower-cased data.id in the signed manifest', () => {
    const secret = 'test-webhook-secret';
    const requestId = 'request-123';
    const resourceId = 'ABC-123';
    const timestamp = '1704908010';
    const manifest = `id:abc-123;request-id:${requestId};ts:${timestamp};`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');
    const handler = new WebhookHandler(secret, 'test-access-token');

    expect(
      handler.validateWebhook(
        `ts=${timestamp},v1=${signature}`,
        resourceId,
        requestId
      )
    ).toBe(true);
  });
});
