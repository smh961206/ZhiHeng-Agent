import test from 'node:test';
import assert from 'node:assert/strict';
import {MongoClient} from 'mongodb';
import {randomUUID} from 'node:crypto';
import {migrateSchema,migrations} from '../server/schema-migrations.mjs';
test('数据库结构迁移：幂等、锁、失败重试、拒绝降级及数据保留',async()=>{
 const client=new MongoClient(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017');
 await client.connect();const db=client.db('zhiheng_schema_test_'+randomUUID().replaceAll('-',''));
 try{
  await db.collection('jobs').insertOne({_id:'keep',createdAt:'2026-01-01'});
  assert.equal(await migrateSchema(db),1);assert.equal(await migrateSchema(db),1);
  assert.equal(await db.collection('schema_migrations').countDocuments(),1);
  await db.collection('schema_locks').insertOne({_id:'upgrade'});
  await assert.rejects(migrateSchema(db),/锁定/);
  await db.collection('schema_locks').deleteOne({_id:'upgrade'});
  let fail=true;
  const next=[...migrations,{version:2,name:'add_field',async up(db){await db.collection('jobs').updateMany({label:{$exists:false}},{$set:{label:'migrated'}});if(fail)throw new Error('injected failure');}}];
  await assert.rejects(migrateSchema(db,next),/injected/);
  assert.equal(await db.collection('schema_migrations').countDocuments(),1);
  assert.equal(await db.collection('schema_locks').countDocuments(),0);
  fail=false;assert.equal(await migrateSchema(db,next),2);
  assert.equal((await db.collection('jobs').findOne({_id:'keep'})).label,'migrated');
  await assert.rejects(migrateSchema(db),/禁止降级/);
 }finally{await db.dropDatabase();await client.close();}
});
