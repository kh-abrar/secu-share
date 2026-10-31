// Folder paths are stored as "/" or "/a/b/" (leading and trailing slash).
// Names are single path segments.
const { z } = require('zod');

const MAX_NAME = 255;
const MAX_DEPTH = 32;
// Control characters and path separators are never allowed in a name
const FORBIDDEN = /[\u0000-\u001f\u007f/\\]/;

function isValidName(name) {
  return (
    typeof name === 'string' &&
    name.length > 0 &&
    name.length <= MAX_NAME &&
    name === name.trim() &&
    name !== '.' &&
    name !== '..' &&
    !FORBIDDEN.test(name)
  );
}

function isValidPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || !path.endsWith('/')) return false;
  if (path === '/') return true;
  const parts = path.slice(1, -1).split('/');
  return parts.length <= MAX_DEPTH && parts.every(isValidName);
}

const nameSchema = z.string().trim().refine(isValidName, 'Invalid name');
const pathSchema = z
  .string()
  .default('/')
  .transform((p) => (p.endsWith('/') ? p : `${p}/`))
  .refine(isValidPath, 'Invalid folder path');

// "/a/b/" + "c" -> "/a/b/c/"
const childPath = (path, name) => `${path}${name}/`;

// "/a/b/" -> [{ path: "/", name: "a" }, { path: "/a/", name: "b" }]
function ancestorsOf(path) {
  const out = [];
  let parent = '/';
  for (const name of path.split('/').filter(Boolean)) {
    out.push({ path: parent, name });
    parent = childPath(parent, name);
  }
  return out;
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { isValidName, isValidPath, nameSchema, pathSchema, childPath, ancestorsOf, escapeRegex };
