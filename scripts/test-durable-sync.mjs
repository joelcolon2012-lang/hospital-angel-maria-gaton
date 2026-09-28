import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hospital-durable-test-'));
process.env.HOSPITAL_DB_DIR = temporary;
process.env.MONGODB_URI = '';
process.env.CLOUD_RELAY = 'off';
const { centralDb } = await import('../server/centralDb.js');
let fail = true;
let writes = 0;
let snapshot;
centralDb.mongo = {
  persistedSeq: centralDb.memoryData.seq,
  async persist(data) {
    writes++;
    if (fail) throw new Error('Simulated storage outage');
    snapshot = structuredClone(data);
    this.persistedSeq = data.seq;
    this.lastError = null;
  }
};
try {
  const patient = { id: 'test-durable-only', fullName: 'PRUEBA AISLADA', _mtime: Date.now() };
  const payload = { tables: { patients: [patient] } };
  await assert.rejects(centralDb.syncV2(payload), /Simulated storage outage/);
  assert.equal(centralDb.memoryData.patients.length, 1);
  assert.ok(centralDb.mongo.persistedSeq < centralDb.memoryData.seq);
  console.log('PASS: failed cloud write rejects confirmation and retains record for retry');
  await assert.rejects(centralDb.syncV2(payload), /Simulated storage outage/);
  assert.equal(writes, 2);
  console.log('PASS: identical retry still attempts durable storage');
  fail = false;
  const result = await centralDb.syncV2(payload);
  assert.equal(result.accepted, 0);
  assert.equal(centralDb.mongo.persistedSeq, centralDb.memoryData.seq);
  assert.equal(snapshot.patients.length, 1);
  assert.equal(snapshot.patients[0].fullName, patient.fullName);
  console.log('PASS: recovery confirms durable data without duplicates');
  fail = true;
  const legacy = { patients: [{ ...patient, fullName: 'PRUEBA EDITADA', _mtime: Date.now() + 1000 }] };
  await assert.rejects(centralDb.syncMasterData(legacy), /Simulated storage outage/);
  fail = false;
  await centralDb.syncMasterData(legacy);
  assert.equal(snapshot.patients[0].fullName, 'PRUEBA EDITADA');
  console.log('PASS: legacy clients also retry unpersisted identical records');
} finally {
  clearTimeout(centralDb.mongoRetry);
  // Only remove the temporary directory created by this test.
  fs.rmSync(temporary, { recursive: true, force: true });
}
