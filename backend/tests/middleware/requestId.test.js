/**
 * Tests for requestId middleware
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestId } from '../../middleware/requestId.js';

describe('requestId middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let finishCallback;

  beforeEach(() => {
    mockReq = {
      id: null,
      startTime: null,
      headers: {},
      method: 'GET',
      url: '/test',
    };
    finishCallback = null;
    mockRes = {
      setHeader: vi.fn(),
      statusCode: 200,
      on: vi.fn((event, callback) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      }),
    };
    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should generate request ID if not present', () => {
    requestId(mockReq, mockRes, mockNext);
    
    expect(mockReq.id).toBeDefined();
    expect(mockReq.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
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
    expect(typeof mockReq.startTime).toBe('number');
  });

  it('should call next', () => {
    requestId(mockReq, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should register finish event handler', () => {
    requestId(mockReq, mockRes, mockNext);
    
    expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    expect(finishCallback).toBeDefined();
  });
});
