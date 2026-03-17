/**
 * Unit tests for PaymentGatewayClient
 */

import {
  PaymentGatewayClient,
  MercadoPagoError,
} from '../PaymentGatewayClient.js';
import { PreApprovalRequest } from '../../models/types.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('PaymentGatewayClient', () => {
  let client: PaymentGatewayClient;
  const mockAccessToken = 'TEST_ACCESS_TOKEN';
  const mockPublicKey = 'TEST_PUBLIC_KEY';

  beforeEach(() => {
    client = new PaymentGatewayClient(mockAccessToken, mockPublicKey);
    jest.clearAllMocks();
  });

  describe('formatExternalReference', () => {
    it('should format external reference correctly', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const plan = 'pro';

      const result = client.formatExternalReference(userId, plan);

      expect(result).toBe('user:123e4567-e89b-12d3-a456-426614174000|plan:pro');
    });

    it('should handle different plan names', () => {
      const userId = 'user-123';

      expect(client.formatExternalReference(userId, 'free')).toBe(
        'user:user-123|plan:free'
      );
      expect(client.formatExternalReference(userId, 'pro')).toBe(
        'user:user-123|plan:pro'
      );
      expect(client.formatExternalReference(userId, 'enterprise')).toBe(
        'user:user-123|plan:enterprise'
      );
    });
  });

  describe('createPreApproval', () => {
    const mockRequest: PreApprovalRequest = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      plan: 'pro',
      priceARS: 5000,
      frequency: 'monthly',
      callbackUrl: 'http://localhost:5001/api/subscriptions/webhooks',
      userEmail: 'test@example.com',
    };

    it('should create PreApproval successfully', async () => {
      const mockResponse = {
        id: 'preapproval-123',
        init_point:
          'https://www.mercadopago.com/mla/debits/new?preapproval-id=preapproval-123',
        status: 'pending',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.createPreApproval(mockRequest);

      expect(result).toEqual({
        preApprovalId: 'preapproval-123',
        initializationUrl:
          'https://www.mercadopago.com/mla/debits/new?preapproval-id=preapproval-123',
        status: 'pending',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.mercadopago.com/preapproval',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockAccessToken}`,
          },
        })
      );

      // Verify the payload includes external reference
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);
      expect(payload.external_reference).toBe(
        'user:123e4567-e89b-12d3-a456-426614174000|plan:pro'
      );
      expect(payload.auto_recurring.transaction_amount).toBe(5000);
      expect(payload.auto_recurring.frequency).toBe(1);
      expect(payload.auto_recurring.frequency_type).toBe('months');
      expect(payload.auto_recurring.currency_id).toBe('ARS');
      expect(payload.payer_email).toBe('test@example.com');
    });

    it('should throw MercadoPagoError on API failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Invalid request' }),
      });

      await expect(client.createPreApproval(mockRequest)).rejects.toThrow(
        'Failed to create PreApproval'
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(client.createPreApproval(mockRequest)).rejects.toThrow(
        MercadoPagoError
      );
      await expect(client.createPreApproval(mockRequest)).rejects.toThrow(
        'Network error creating PreApproval'
      );
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await expect(
        client.cancelSubscription({ preApprovalId: 'preapproval-123' })
      ).resolves.not.toThrow();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.mercadopago.com/preapproval/preapproval-123',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockAccessToken}`,
          },
        })
      );

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);
      expect(payload.status).toBe('cancelled');
    });

    it('should throw MercadoPagoError on API failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'PreApproval not found' }),
      });

      await expect(
        client.cancelSubscription({ preApprovalId: 'invalid-id' })
      ).rejects.toThrow('Invalid PreApproval ID: Subscription not found');
    });
  });

  describe('pauseSubscription', () => {
    it('should pause subscription successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await expect(
        client.pauseSubscription({ preApprovalId: 'preapproval-123' })
      ).resolves.not.toThrow();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.mercadopago.com/preapproval/preapproval-123',
        expect.objectContaining({
          method: 'PUT',
        })
      );

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);
      expect(payload.status).toBe('paused');
    });

    it('should throw MercadoPagoError on API failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Cannot pause subscription' }),
      });

      await expect(
        client.pauseSubscription({ preApprovalId: 'preapproval-123' })
      ).rejects.toThrow(MercadoPagoError);
    });
  });

  describe('resumeSubscription', () => {
    it('should resume subscription successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await expect(
        client.resumeSubscription({ preApprovalId: 'preapproval-123' })
      ).resolves.not.toThrow();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.mercadopago.com/preapproval/preapproval-123',
        expect.objectContaining({
          method: 'PUT',
        })
      );

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);
      expect(payload.status).toBe('authorized');
    });

    it('should throw MercadoPagoError on API failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Cannot resume subscription' }),
      });

      await expect(
        client.resumeSubscription({ preApprovalId: 'preapproval-123' })
      ).rejects.toThrow(MercadoPagoError);
    });
  });

  describe('Error handling', () => {
    it('should include status code and response in MercadoPagoError', async () => {
      const errorResponse = {
        message: 'Invalid credentials',
        code: 'AUTH_ERROR',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => errorResponse,
      });

      try {
        await client.createPreApproval({
          userId: 'user-123',
          plan: 'pro',
          priceARS: 5000,
          frequency: 'monthly',
          callbackUrl: 'http://localhost:5001/webhooks',
          userEmail: 'test@example.com',
        });
        fail('Should have thrown MercadoPagoError');
      } catch (error) {
        expect(error).toBeInstanceOf(MercadoPagoError);
        if (error instanceof MercadoPagoError) {
          expect(error.statusCode).toBe(401);
          expect(error.response).toEqual(errorResponse);
        }
      }
    });
  });
});
