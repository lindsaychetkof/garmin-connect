import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
// Load pure TypeScript modules in Node without modifying framework import paths.
function loadModule(path,replacements={}){
  let source=readFileSync(new URL(path,import.meta.url),'utf8');
  for(const [from,to]of Object.entries(replacements))source=source.replaceAll(`'${from}'`,`'${to}'`);
  return 'data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source,{mode:'transform'})).toString('base64');
}
const configURL=loadModule('../lib/config.ts');
const garminURL=loadModule('../lib/garmin.ts',{'./config':configURL});
const g=await import(garminURL);
const {encryptKey,decryptKey}=await import(loadModule('../lib/key-crypto.ts'));
const {validateArguments,TOOLS}=await import(loadModule('../lib/tool-contract.ts',{'./garmin':garminURL}));
test('keys are encrypted with unique nonces and bound to their user',async()=>{
  const secret=Buffer.alloc(32,9).toString('base64');const a=await encryptKey('fake-key','user-one',secret),b=await encryptKey('fake-key','user-one',secret);
  assert.notEqual(a,b);assert.ok(!a.includes('fake-key'));assert.equal(await decryptKey(a,'user-one',secret),'fake-key');await assert.rejects(decryptKey(a,'user-two',secret));
});
test('calendar dates use the deployment timezone, including DST',()=>{
  assert.deepEqual(g.dateWindow(7,new Date('2026-10-27T01:00:00Z')),{start:'2026-10-20',end:'2026-10-26'});
  assert.deepEqual(g.dateWindow(7,new Date('2026-11-02T02:00:00Z')),{start:'2026-10-26',end:'2026-11-01'});
});
test('history ranges paginate without gaps across leap days',()=>{
  assert.deepEqual(g.historyWindow('2020-02-01','2020-04-01'),{start:'2020-02-01',end:'2020-03-02',next_start_date:'2020-03-03',requested_end_date:'2020-04-01'});
  assert.equal(g.historyWindow('2020-03-03','2020-04-01').next_start_date,null);
  assert.throws(()=>g.historyWindow('2020-02-30','2020-03-01'));
  assert.throws(()=>g.historyWindow('2020-04-01','2020-03-01'));
});
test('daily update keeps yesterday evening workouts within 24h and the latest wellness record',()=>{
  const context={notes:[],sections:{activities:{status:'fetched',metrics:[{activityId:1,startTimeGMT:'2026-10-29 23:00:00'},{activityId:2,startTimeGMT:'2026-10-28 09:00:00'}]},daily:{status:'fetched',metrics:{data:[{calendarDate:'2026-10-29',movement:{steps:{value:9000}}},{calendarDate:'2026-10-30',movement:{steps:{value:0}}}]}},hrv:{status:'unavailable',error:'missing'}}};
  const compact=g.compactDaily(context,new Date('2026-10-30T12:00:00Z'));
  assert.equal(compact.sections.activities.metrics.length,1);assert.equal(compact.sections.daily.metrics.calendarDate,'2026-10-30');assert.equal(compact.sections.daily.metrics.movement.steps.value,0);assert.equal(compact.sections.hrv.status,'unavailable');
});
test('daily response nesting is preserved without identifiers',()=>{
  assert.deepEqual(g.selectMetrics({data:[{uuid:'private',userProfilePk:99,calendarDate:'2020-01-01',heartRate:{restingValue:50},movement:{steps:{value:0,distanceInMeters:0}}}]}),{data:[{calendarDate:'2020-01-01',heartRate:{restingValue:50},movement:{steps:{value:0,distanceInMeters:0}}}]});
});
test('token request accepts text, uses manual redirects, and never follows credentials',async()=>{
  assert.equal(await g.verifyKey('fake',async(_url,init)=>{assert.equal(init.headers.Accept,'*/*');assert.equal(init.redirect,'manual');return new Response('token');}),'token');
  let calls=0;await assert.rejects(g.verifyKey('fake',async()=>{calls++;return new Response(null,{status:302,headers:{Location:'https://invalid.example'}});}),/without forwarding/);assert.equal(calls,1);
  await assert.rejects(g.verifyKey('fake',async()=>new Response('fake-private-body',{status:401})),e=>e.message.includes('401')&&!e.message.includes('private'));
});
test('targeted history requests fetch only selected sections',async()=>{
  const calls=[];const data=await g.fetchRange('fake','2020-01-01','2020-01-02',['sleep'],async(url,init)=>{calls.push(url);return init.method==='POST'?new Response('token'):Response.json([]);});
  assert.deepEqual(Object.keys(data.sections),['sleep']);assert.equal(calls.length,2);
});
test('workout pagination returns continuation without dropping repeated workouts in context',async()=>{
  const result=await g.fetchActivities('fake','2020-01-01','2020-12-31',0,1,undefined,async(_url,init)=>init.method==='POST'?new Response('token'):Response.json([{activityId:1,activityName:'Private',startLatitude:44,averageHR:150}]));
  assert.equal(result.next_offset,1);assert.ok(!JSON.stringify(result).includes('Private'));assert.ok(!JSON.stringify(result).includes('Latitude'));
});
test('activity detail exposes measurements and splits but excludes locations and notes',async()=>{
  const result=await g.fetchActivityDetails('fake','123',true,async(url,init)=>{
    if(init.method==='POST')return new Response('token');
    if(url.endsWith('/workouts'))return Response.json([{workoutName:'Private',steps:[{stepIndex:1,exerciseName:'SQUAT',exerciseWeightValue:30,notes:'Private',targetValue:10}]}]);
    return Response.json({activityId:123,activityName:'Private',userProfileId:99,summaryDTO:{averagePower:210,averageRunCadence:170,startLatitude:44,totalSets:4},splitSummaries:[{splitType:'RUN_ACTIVE',duration:300,averageHR:150,endLongitude:55}]});
  });
  assert.equal(result.summary.averagePower,210);assert.equal(result.split_summaries[0].averageHR,150);assert.equal(result.associated_workouts.data[0].steps[0].exerciseName,'SQUAT');
  const all=JSON.stringify(result);assert.ok(!all.includes('Private'));assert.ok(!all.includes('startLatitude'));assert.ok(!all.includes('userProfileId'));assert.ok(!all.includes('endLongitude'));
});
test('tool arguments reject invalid identifiers, unknown fields, impossible dates, and huge requests',()=>{
  assert.equal(TOOLS.length,6);assert.deepEqual(validateArguments('get_daily_update',{}),{});
  for(const [name,args]of [['get_daily_update',{days:31}],['get_health_context',{days:32}],['get_health_context',{force_refresh:'yes'}],['get_activities',{start_date:'2020-02-30',end_date:'2020-03-01'}],['get_activities',{start_date:'2020-01-01',end_date:'2020-02-01',limit:500}],['get_activity_details',{activity_id:'../profile'}],['get_health_history',{start_date:'2020-01-01',end_date:'2020-02-01',sections:['sleep','sleep']}],['get_connection_status',{userId:'someone-else'}]])assert.throws(()=>validateArguments(name,args));
});
