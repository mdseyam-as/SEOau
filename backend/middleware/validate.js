import { z } from 'zod';

/**
 * Validation middleware factory
 * Creates Express middleware that validates request body against a Zod schema
 */
export const validate = (schema) => {
    return (req, res, next) => {
        try {
            const result = schema.safeParse(req.body);

            if (!result.success) {
                const errors = result.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));

                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors
                });
            }

            // Replace body with validated/transformed data
            req.body = result.data;
            next();
        } catch (error) {
            console.error('Validation error:', error);
            res.status(500).json({ error: 'Validation error' });
        }
    };
};

/**
 * Validate query parameters
 * In Express 5, req.query is read-only, so we store validated data in req.validatedQuery
 * but also merge defaults back for backwards compatibility
 */
export const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            const result = schema.safeParse(req.query);

            if (!result.success) {
                const errors = result.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));

                return res.status(400).json({
                    error: 'Query validation failed',
                    details: errors
                });
            }

            // Store validated query with defaults applied
            // In Express 5, req.query is read-only, so use a separate property
            req.validatedQuery = result.data;
            next();
        } catch (error) {
            console.error('Query validation error:', error);
            res.status(500).json({ error: 'Validation error' });
        }
    };
};

/**
 * Validate URL parameters
 * In Express 5, req.params is read-only, so we store validated data in req.validatedParams
 */
export const validateParams = (schema) => {
    return (req, res, next) => {
        try {
            const result = schema.safeParse(req.params);

            if (!result.success) {
                const errors = result.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));

                return res.status(400).json({
                    error: 'Parameter validation failed',
                    details: errors
                });
            }

            // Store validated params
            req.validatedParams = result.data;
            next();
        } catch (error) {
            console.error('Params validation error:', error);
            res.status(500).json({ error: 'Validation error' });
        }
    };
};
