import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccessPolicy} from '../server/access.mjs';
test('部署域名白名单与跨站写入保护',()=>{
 const allow=createAccessPolicy('https://research.example.com');
 const req=(host,origin,method='POST')=>({method,headers:{host,...(origin?{origin}:{})}});
 assert.equal(allow(req('research.example.com','https://research.example.com')),true);
 assert.equal(allow(req('research.example.com','https://evil.example.com')),false);
 assert.equal(allow(req('evil.example.com',null,'GET')),false);
 assert.equal(allow(req('127.0.0.1:3001',null,'GET')),true);
 assert.equal(allow(req('localhost:5173','http://localhost:5173')),true);
 assert.equal(allow(req('localhost:3001','https://evil.example.com','DELETE')),false);
 assert.equal(allow(req('localhost:3001','http://localhost:5173','DELETE')),true);
 assert.throws(()=>createAccessPolicy('https://research.example.com/path'));
});
