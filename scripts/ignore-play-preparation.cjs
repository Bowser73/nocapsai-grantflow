// The Play preparation branch must not run deployment-time migrations before review.
// Return 0 to skip this branch's preview; return 1 to keep Vercel's normal build path.
const skip = process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF === 'codex/grantflow-google-play';
console.log(skip ? 'Skipping GrantFlow preparation preview: server configuration and review are pending.' : 'Continue normal GrantFlow build.');
process.exit(skip ? 0 : 1);
