const { z } = require('zod');
const { badRequest } = require('./errors');

/**
 * Validates request parts against zod schemas and exposes the parsed values on
 * req.valid.{body,query,params}. (Express 5 makes req.query read-only.)
 */
function validate(schemas) {
  return (req, _res, next) => {
    req.valid = {};
    for (const part of ['params', 'query', 'body']) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part] ?? {});
      if (!result.success) {
        const issue = result.error.issues[0];
        const field = issue.path.join('.');
        throw badRequest(field ? `${field}: ${issue.message}` : issue.message);
      }
      req.valid[part] = result.data;
    }
    next();
  };
}

// Shared field schemas
const objectId = z.string().regex(/^[a-f0-9]{24}$/, 'Invalid id');
const email = z.string().trim().toLowerCase().max(254).email('Invalid email address');
const base64 = (max) => z.string().max(max).regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Invalid encoding');
// Client-derived login secret: base64 of 32 bytes (see frontend/src/libs/crypto.ts)
const authHash = z.string().regex(/^[A-Za-z0-9+/]{43}=$/, 'Invalid credentials format');

module.exports = { validate, objectId, email, base64, authHash };
