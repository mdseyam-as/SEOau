/**
 * Tests for requestId middleware
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestId } from '../../middleware/requestId.js';

describe('requestId middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      id: null,
      startTime: null,
      headers: {},
    };
    mockRes = {
      setHeader: vi.fn(),
    };
    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should generate request ID if not present', () => {
    requestId(mockReq, mockRes, mockNext);
    
    expect(mockReq.id).toBeDefined();
    expect(mockReq.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('should use existing request ID from headers', () => {
    const existingId = 'existing-request-id-123';
    mockReq.headers['x-request-id'] = existingId;
    
    requestId(mockReq, mockRes, mockNext);
    
    expect(mockReq.id).toBe(existingId);
  });

  it('should set X-Request-Id header', () => {
    requestId(mockReq, mockRes, mockNext);
    
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-Id', mockReq.id);
  });

  it('should set start time', () => {
    requestId(mockReq, mockRes, mockNext);
    
    expect(mockReq.startTime).toBeDefined();
    expect(mockReq.startTime).toBeType('number');
  });

  it('should call next', () => {
    requestId(mockReq, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should handle finish event', () => {
    requestId(mockReq, mockRes, mockNext);
    
    // Simulate finish event
    const finishHandler = mockReq.listeners?.('finish')?.[0];
    if (finishHandler) {
      mockReq.emit('finish');
      
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-Id', mockReq.id);
    }
  });
});
