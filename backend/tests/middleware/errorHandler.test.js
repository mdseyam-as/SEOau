/**
 * Tests for errorHandler middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler, notFoundHandler, asyncHandler } from '../../middleware/errorHandler.js';
import { ApiError, createApiError, ERROR_CODES } from '../../utils/errors.js';

describe('errorHandler middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      id: 'test-request-id',
      path: '/test',
      method: 'GET',
      telegramUser: { id: 123 },
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
  });

  it('should handle ApiError correctly', () => {
    const apiError = createApiError('INVALID_API_KEY');
    
    errorHandler(apiError, mockReq, mockRes, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(apiError.httpStatus);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: apiError.message,
      code: apiError.code,
      requestId: mockReq.id
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle generic Error', () => {
    const genericError = new Error('Generic error');
    
    errorHandler(genericError, mockReq, mockRes, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Внутренняя ошибка',
      code: 5000,
      requestId: mockReq.id
    });
  });

  it('should not send response if headers already sent', () => {
    mockRes.headersSent = true;
    const error = new Error('Test error');
    
    errorHandler(error, mockReq, mockRes, mockNext);
    
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });
});

describe('notFoundHandler', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      id: 'test-request-id',
      path: '/not-found',
      method: 'GET',
      telegramUser: { id: 123 },
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it('should return 404 with error message', () => {
    notFoundHandler(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Route not found',
      code: 4040,
      requestId: mockReq.id
    });
  });
});

describe('asyncHandler', () => {
  it('should resolve async function', async () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    const wrappedFn = asyncHandler(asyncFn);
    
    const result = await wrappedFn(null, null, null);
    
    expect(result).toBe('result');
  });

  it('should reject async function with error', async () => {
    const error = new Error('Test error');
    const asyncFn = vi.fn().mockRejectedValue(error);
    const wrappedFn = asyncHandler(asyncFn);
    
    await expect(wrappedFn(null, null, null)).rejects.toThrow(error);
  });
});
