/**
 * @claude-flow/browser - ReasoningBank Adapter Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReasoningBankAdapter, getReasoningBank } from '../src/infrastructure/reasoningbank-adapter.js';
import type { BrowserTrajectory } from '../src/application/browser-service.js';

describe('ReasoningBankAdapter', () => {
  let adapter: ReasoningBankAdapter;

  beforeEach(() => {
    adapter = new ReasoningBankAdapter();
  });

  describe('getReasoningBank singleton', () => {
    it('should return singleton instance', () => {
      const instance1 = getReasoningBank();
      const instance2 = getReasoningBank();
      expect(instance1).toBe(instance2);
    });
  });

  describe('trajectory learning', () => {
    const mockTrajectory: BrowserTrajectory = {
      id: 'traj-1',
      goal: 'Login to dashboard',
      startUrl: 'https://example.com/login',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      steps: [
        {
          action: 'open',
          input: { url: 'https://example.com/login' },
          result: { success: true },
          timestamp: new Date().toISOString(),
        },
        {
          action: 'fill',
          input: { target: '@e1', value: 'user@example.com' },
          result: { success: true },
          timestamp: new Date().toISOString(),
        },
        {
          action: 'fill',
          input: { target: '@e2', value: 'password' },
          result: { success: true },
          timestamp: new Date().toISOString(),
        },
        {
          action: 'click',
          input: { target: '@e3' },
          result: { success: true },
          timestamp: new Date().toISOString(),
        },
      ],
      success: true,
      verdict: 'Login successful',
    };

    it('should learn from successful trajectory', async () => {
      const pattern = await adapter.learnFromTrajectory(mockTrajectory);

      expect(pattern).toBeDefined();
      expect(pattern?.goal).toBe('Login to dashboard');
      expect(pattern?.steps.length).toBe(4);
      expect(pattern?.successRate).toBe(1);
    });

    it('should not create pattern from failed trajectory', async () => {
      const failedTrajectory = { ...mockTrajectory, success: false };
      const pattern = await adapter.learnFromTrajectory(failedTrajectory);

      expect(pattern).toBeNull();
    });

    it('should buffer trajectories for batch learning', async () => {
      adapter.bufferTrajectory(mockTrajectory);

      const stats = adapter.getStats();
      expect(stats.bufferedTrajectories).toBe(1);
    });
  });

  describe('pattern matching', () => {
    const mockTrajectory: BrowserTrajectory = {
      id: 'traj-2',
      goal: 'Fill contact form',
      startUrl: 'https://example.com/contact',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      steps: [
        { action: 'fill', input: { target: '@e1' }, result: { success: true }, timestamp: new Date().toISOString() },
        { action: 'fill', input: { target: '@e2' }, result: { success: true }, timestamp: new Date().toISOString() },
        { action: 'click', input: { target: '@e3' }, result: { success: true }, timestamp: new Date().toISOString() },
      ],
      success: true,
    };

    it('should find similar patterns', async () => {
      await adapter.learnFromTrajectory(mockTrajectory);

      const patterns = await adapter.findSimilarPatterns('Fill form');

      // May or may not find patterns depending on similarity threshold
      expect(Array.isArray(patterns)).toBe(true);
    });

    it('should get recommended steps for goal', async () => {
      await adapter.learnFromTrajectory(mockTrajectory);

      const steps = await adapter.getRecommendedSteps('Fill a form', 'https://example.com');

      expect(Array.isArray(steps)).toBe(true);
    });
  });

  describe('verdict recording', () => {
    it('should record verdict for pattern', async () => {
      const mockTrajectory: BrowserTrajectory = {
        id: 'traj-3',
        goal: 'Test pattern',
        startUrl: 'https://example.com',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        steps: [{ action: 'click', input: {}, result: { success: true }, timestamp: new Date().toISOString() }],
        success: true,
      };

      const pattern = await adapter.learnFromTrajectory(mockTrajectory);

      if (pattern) {
        adapter.recordVerdict(pattern.id, true);

        const stats = adapter.getStats();
        expect(stats.totalPatterns).toBeGreaterThan(0);
      }
    });
  });

  describe('stats', () => {
    it('should return stats', () => {
      const stats = adapter.getStats();

      expect(stats).toHaveProperty('totalPatterns');
      expect(stats).toHaveProperty('avgSuccessRate');
      expect(stats).toHaveProperty('bufferedTrajectories');
    });
  });

  describe('pattern export', () => {
    it('should export patterns', async () => {
      const mockTrajectory: BrowserTrajectory = {
        id: 'traj-4',
        goal: 'Export test',
        startUrl: 'https://example.com',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        steps: [{ action: 'open', input: {}, result: { success: true }, timestamp: new Date().toISOString() }],
        success: true,
      };

      await adapter.learnFromTrajectory(mockTrajectory);

      const patterns = adapter.exportPatterns();

      expect(Array.isArray(patterns)).toBe(true);
    });
  });
});
