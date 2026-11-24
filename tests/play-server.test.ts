import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import prisma from '../lib/db/prisma';
import {verifyPlayPurchase,playPlanFor} from '../lib/billing/play-server';
import {PLAY_PRODUCT} from '../lib/billing/play-policy';

test('Play verification with isolated database and Google transport fixtures',async t=>{
 const originalFetch=globalThis.fetch;
 const originalEnv={enabled:process.env.GOOGLE_PLAY_BILLING_ENABLED,sa:process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON,key:process.env.GOOGLE_PLAY_TOKEN_KEY};
 const delegate=prisma.playSubscription;
 const original={findUnique:delegate.findUnique,findMany:delegate.findMany,upsert:delegate.upsert};
 const rows=new Map<string,any>();let ackCount=0,mode='active';
 const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
 process.env.GOOGLE_PLAY_BILLING_ENABLED='true';process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=JSON.stringify({client_email:'fixture@example.invalid',private_key:privateKey});process.env.GOOGLE_PLAY_TOKEN_KEY=Buffer.alloc(32,1).toString('base64');
 delegate.findUnique=(async({where}:any)=>rows.get(where.tokenHash)||null) as any;
 delegate.findMany=(async({where}:any)=>Array.from(rows.values()).filter(r=>r.userId===where.userId)) as any;
 delegate.upsert=(async({where,create,update}:any)=>{const existing=rows.get(where.tokenHash);const row=existing?{...existing,...update}:{...create,id:'fixture-'+rows.size};rows.set(where.tokenHash,row);return row;}) as any;
 globalThis.fetch=(async(url:any,options:any)=>{
  const address=String(url);
  if(address==='https://oauth2.googleapis.com/token')return Response.json({access_token:'fixture-access-token'});
  assert.ok(address.startsWith('https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.nocapsai.grantflow/purchases/'));
  assert.equal(options.headers.Authorization,'Bearer fixture-access-token');
  if(mode==='network-error')throw Error('Fixture network outage');
  if(mode==='not-found')return new Response('',{status:404});
  if(address.endsWith(':acknowledge')){ackCount++;assert.equal(options.method,'POST');return new Response(null,{status:204});}
  return Response.json({subscriptionState:mode==='expired'?'SUBSCRIPTION_STATE_EXPIRED':'SUBSCRIPTION_STATE_ACTIVE',acknowledgementState:'ACKNOWLEDGEMENT_STATE_PENDING',...(mode==='wrong-account'?{externalAccountIdentifiers:{obfuscatedExternalAccountId:'different-account'}}:{}),lineItems:[{productId:mode==='wrong-product'?'another_product':PLAY_PRODUCT,expiryTime:new Date(Date.now()+3600000).toISOString()}]});
 }) as typeof fetch;
 try{
  await t.test('verifies and acknowledges an active purchase; encrypts the stored token',async()=>{const r=await verifyPlayPurchase('user-one','fixture-token-one');assert.equal(r.active,true);assert.equal(ackCount,1);const row=Array.from(rows.values())[0];assert.equal(row.userId,'user-one');assert.notEqual(row.encryptedToken,'fixture-token-one');assert.equal(row.tokenHash.length,64);assert.equal(await playPlanFor('user-one'),'PRO');});
  await t.test('rejects a second GrantFlow account claiming the same token',async()=>{await assert.rejects(verifyPlayPurchase('user-two','fixture-token-one'),/another GrantFlow account/);assert.equal(ackCount,1);});
  await t.test('rejects a valid purchase for a different product',async()=>{mode='wrong-product';await assert.rejects(verifyPlayPurchase('user-one','fixture-token-other-product'),/Unexpected subscription product/);assert.equal(rows.size,1);});
  await t.test('rejects a mismatched obfuscated account identifier',async()=>{mode='wrong-account';await assert.rejects(verifyPlayPurchase('user-one','fixture-token-wrong-account'),/does not match/);assert.equal(rows.size,1);});
  await t.test('a fabricated purchase token cannot grant access',async()=>{mode='not-found';await assert.rejects(verifyPlayPurchase('user-three','fixture-token-forged'),/HTTP 404/);assert.equal(await playPlanFor('user-three'),'FREE');});
  await t.test('refresh revokes access when Google reports expiry or revocation',async()=>{mode='expired';const row=Array.from(rows.values())[0];row.verifiedAt=new Date(Date.now()-600000);assert.equal(await playPlanFor('user-one'),'FREE');});
  await t.test('stale verification fails closed during an outage',async()=>{mode='network-error';const row=Array.from(rows.values())[0];row.state='SUBSCRIPTION_STATE_ACTIVE';row.verifiedAt=new Date(Date.now()-600000);assert.equal(await playPlanFor('user-one'),'FREE');});
  await t.test('disabled rollout never queries the Google transport',async()=>{process.env.GOOGLE_PLAY_BILLING_ENABLED='false';assert.equal(await playPlanFor('user-one'),'FREE');await assert.rejects(verifyPlayPurchase('user-one','fixture-token-disabled'),/not enabled/);});
 }finally{globalThis.fetch=originalFetch;delegate.findUnique=original.findUnique;delegate.findMany=original.findMany;delegate.upsert=original.upsert;for(const [name,value] of Object.entries({GOOGLE_PLAY_BILLING_ENABLED:originalEnv.enabled,GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:originalEnv.sa,GOOGLE_PLAY_TOKEN_KEY:originalEnv.key})){if(value===undefined)delete process.env[name];else process.env[name]=value;}await prisma.$disconnect();}
});
