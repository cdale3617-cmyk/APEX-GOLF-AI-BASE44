import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLaunchMonitorCsv } from '../src/lib/launchImport.js';

test('import real measurements with mph to km/h conversion',()=>{
 const rows=parseLaunchMonitorCsv('Club,Ball Speed (mph),Launch Angle,Side Spin,Spin Rate,Carry\nDriver,150,13,200,2600,250');
 assert.equal(rows.length,1);
 assert.equal(rows[0].club,'Driver');
 assert.ok(Math.abs(rows[0].speedKmh-241.4016)<.01);
 assert.equal(rows[0].angle,13);
 assert.equal(rows[0].sideSpin,200);
});
test('rejects missing launch measurement',()=>{
 assert.throws(()=>parseLaunchMonitorCsv('Club,Spin Rate\nDriver,2400'),/Ball Speed|CSV|readable/i);
});
