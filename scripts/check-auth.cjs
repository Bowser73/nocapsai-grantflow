const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const bcrypt = require('bcryptjs');
let config;
const prisma = { user: {} };
const compiled = ts.transpileModule(fs.readFileSync('auth.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true }
}).outputText;
vm.runInNewContext(compiled, {
  exports: {}, process: { env: {} }, console: { error() {} },
  require(name) {
    return {
      'next-auth': (options) => { config = options; return {}; },
      '@auth/prisma-adapter': { PrismaAdapter: () => ({}) },
      'next-auth/providers/credentials': (options) => options,
      'next-auth/providers/google': () => ({}),
      bcryptjs: bcrypt, '@/lib/db/prisma': prisma,
      './auth.config': { authConfig: {} }
    }[name];
  }
});
(async () => {
  const authorize = config.providers[0].authorize;
  const hash = await bcrypt.hash('test-password', 4);
  const user = { id: 'test-user', email: 'Mixed@Example.com', passwordHash: hash };
  prisma.user.findUnique = async () => null;
  prisma.user.findMany = async (query) => {
    assert.equal(query.where.email.equals, 'mixed@example.com');
    assert.equal(query.where.email.mode, 'insensitive');
    return [user];
  };
  assert.equal((await authorize({ email: ' Mixed@Example.com ', password: 'test-password' })).id, user.id);
  assert.equal(await authorize({ email: 'mixed@example.com', password: 'wrong' }), null);
  prisma.user.findMany = async () => [];
  assert.equal(await authorize({ email: 'missing@example.com', password: 'test-password' }), null);
  prisma.user.findMany = async () => [user, { ...user, id: 'other' }];
  assert.equal(await authorize({ email: 'mixed@example.com', password: 'test-password' }), null);
  prisma.user.findUnique = async () => { throw new Error('database unavailable'); };
  await assert.rejects(authorize({ email: 'mixed@example.com', password: 'test-password' }), /Sign-in service unavailable/);
  assert.equal(await authorize({}), null);
  console.log('PASS: legacy email case, wrong password, missing account, ambiguous account, database failure, missing credentials');
})().catch(error => { console.error(error); process.exitCode = 1; });
