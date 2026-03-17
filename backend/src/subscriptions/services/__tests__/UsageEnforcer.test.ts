/**
 * Unit tests for UsageEnforcer
 *
 * Currently simplified since AI features are not implemented yet.
 */

import { UsageEnforcer } from '../UsageEnforcer.js';

describe('UsageEnforcer', () => {
  let enforcer: UsageEnforcer;

  beforeEach(() => {
    enforcer = new UsageEnforcer();
  });

  describe('checkClinicalNoteUsage', () => {
    it('should always allow usage since AI features are not active', async () => {
      const result = await enforcer.checkClinicalNoteUsage('test-user-id');
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkRecordingMinutesUsage', () => {
    it('should always allow usage since AI features are not active', async () => {
      const result = await enforcer.checkRecordingMinutesUsage('test-user-id');
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkTokenUsage', () => {
    it('should always allow usage since AI features are not active', async () => {
      const result = await enforcer.checkTokenUsage('test-user-id', 1000);
      expect(result.allowed).toBe(true);
    });
  });

  describe('recordClinicalNoteUsage', () => {
    it('should be a no-op since AI features are not active', async () => {
      await expect(
        enforcer.recordClinicalNoteUsage('test-user-id')
      ).resolves.toBeUndefined();
    });
  });

  describe('recordRecordingMinutesUsage', () => {
    it('should be a no-op since AI features are not active', async () => {
      await expect(
        enforcer.recordRecordingMinutesUsage('test-user-id', 30)
      ).resolves.toBeUndefined();
    });
  });

  describe('recordTokenUsage', () => {
    it('should be a no-op since AI features are not active', async () => {
      await expect(
        enforcer.recordTokenUsage('test-user-id', 100, 200, 0.5)
      ).resolves.toBeUndefined();
    });
  });
});
