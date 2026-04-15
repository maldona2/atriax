/**
 * Unit tests for WhatsApp webhook routes
 */

import type { MetaWebhookPayload } from '../types.js';

describe('WhatsApp webhook message extraction', () => {
  it('should extract text from text messages', () => {
    const payload: MetaWebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry-1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '123456789',
                  phone_number_id: 'phone-id-1',
                },
                messages: [
                  {
                    from: '5491112345678',
                    id: 'msg-1',
                    timestamp: '1234567890',
                    type: 'text',
                    text: { body: 'SI' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const messages = payload.entry?.[0]?.changes?.[0]?.value?.messages ?? [];
    const msg = messages[0]!;
    
    let messageText: string | undefined;
    if (msg.type === 'text' && msg.text?.body) {
      messageText = msg.text.body;
    }

    expect(messageText).toBe('SI');
  });

  it('should extract text from interactive button replies', () => {
    const payload: MetaWebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry-1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '123456789',
                  phone_number_id: 'phone-id-1',
                },
                messages: [
                  {
                    from: '5491112345678',
                    id: 'msg-1',
                    timestamp: '1234567890',
                    type: 'interactive',
                    interactive: {
                      type: 'button_reply',
                      button_reply: {
                        id: 'btn-cancel',
                        title: 'CANCELAR',
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const messages = payload.entry?.[0]?.changes?.[0]?.value?.messages ?? [];
    const msg = messages[0]!;
    
    let messageText: string | undefined;
    if (msg.type === 'text' && msg.text?.body) {
      messageText = msg.text.body;
    } else if (
      msg.type === 'interactive' &&
      msg.interactive?.button_reply?.title
    ) {
      messageText = msg.interactive.button_reply.title;
    }

    expect(messageText).toBe('CANCELAR');
  });

  it('should handle messages without text or interactive content', () => {
    const payload: MetaWebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry-1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '123456789',
                  phone_number_id: 'phone-id-1',
                },
                messages: [
                  {
                    from: '5491112345678',
                    id: 'msg-1',
                    timestamp: '1234567890',
                    type: 'image',
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const messages = payload.entry?.[0]?.changes?.[0]?.value?.messages ?? [];
    const msg = messages[0]!;
    
    let messageText: string | undefined;
    if (msg.type === 'text' && msg.text?.body) {
      messageText = msg.text.body;
    } else if (
      msg.type === 'interactive' &&
      msg.interactive?.button_reply?.title
    ) {
      messageText = msg.interactive.button_reply.title;
    }

    expect(messageText).toBeUndefined();
  });
});
