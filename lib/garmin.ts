// Endpoint contracts: https://github.com/garmin/connect-personal-api-python
import { TIME_ZONE } from './config';
import { HEALTH_SCHEMAS } from './health-schema';
export const BASE='https://personal.connectapi.garmin.com';
export const TOKEN_PATH='/personalapitoken-service/personal-api/personal-api-key/token';
export class GarminError extends Error {}
const fields=new Set(`calendarDate date totalSteps restingHeartRate averageStressLevel maxStressLevel totalDistanceMeters activeKilocalories totalKilocalories moderateIntensityMinutes vigorousIntensityMinutes bodyBatteryChargedValue bodyBatteryDrainedValue bodyBatteryHighestValue bodyBatteryLowestValue bodyBatteryMostRecentValue sleepTimeSeconds napTimeSeconds deepSleepSeconds lightSleepSeconds remSleepSeconds awakeSleepSeconds sleepScores overall value qualifierKey score sleepStartTimestampGMT sleepEndTimestampGMT averageRespirationValue avgSleepStress avgHeartRate hrvSummary weeklyAvg lastNightAvg lastNight5MinHigh baseline balancedLow balancedUpper lowUpper status dailySleepDTO hrvSummaries data dailySleepSummaries charged drained`.split(' '));
for(const field of `movement calories heartRate intensityMinutes stress bodyBattery hydration respiration pulseOx steps pushes floorsAscended floorsDescended goal value distanceInMeters burnedResting burnedActive burnedTotal consumedGoal consumedValue consumedRemaining minValue maxValue restingValue alertCount moderate vigorous avgLevel maxLevel restProportion activityProportion uncategorizedProportion lowStressProportion mediumStressProportion highStressProportion qualifier totalDurationInMillis restDurationInMillis activityDurationInMillis uncategorizedDurationInMillis lowStressDurationInMillis mediumStressDurationInMillis highStressDurationInMillis chargedValue drainedValue latestValue endOfDayValue goalInMl goalInFractionalMl consumedInFractionalMl avgValue latestTimestampGmt latestTimestampLocal`.split(' '))fields.add(field);
function addSleepFields(schema:any,seen=new Set<string>()){
  if(schema.ref){if(seen.has(schema.ref))return;seen.add(schema.ref);return addSleepFields(HEALTH_SCHEMAS[schema.ref],seen);}
  for(const [key,value]of Object.entries(schema.properties??{})){fields.add(key);addSleepFields(value,seen);}
  if(schema.items)addSleepFields(schema.items,seen);
}
addSleepFields(HEALTH_SCHEMAS.DailySleepDTO);
export const SECTIONS=['activities','daily','sleep','hrv','body_battery'] as const;
export type Section=typeof SECTIONS[number];
export function validateDate(value:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T12:00:00Z'))||new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value)throw new GarminError('Dates must be real calendar dates in YYYY-MM-DD format.');
  return value;
}
export function historyWindow(start:string,end:string){
  validateDate(start);validateDate(end);
  if(start>end)throw new GarminError('start_date must be on or before end_date.');
  if(end>dateWindow(1).end)throw new GarminError('Dates cannot be later than today in America/New_York.');
  const boundary=new Date(start+'T12:00:00Z');boundary.setUTCDate(boundary.getUTCDate()+30);
  const pageEnd=boundary.toISOString().slice(0,10)<end?boundary.toISOString().slice(0,10):end;
  const next=new Date(pageEnd+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);
  return {start,end:pageEnd,next_start_date:pageEnd<end?next.toISOString().slice(0,10):null,requested_end_date:end};
}
export function selectMetrics(value:any):any{
  if(Array.isArray(value))return value.map(selectMetrics);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>fields.has(k)).map(([k,v])=>[k,selectMetrics(v)]));
  return value;
}
export function activityMetrics(item:any){
  const keys=['activityId','startTimeLocal','startTimeGMT','duration','movingDuration','elapsedDuration','distance','averageHR','maxHR','averageSpeed','maxSpeed','elevationGain','elevationLoss','calories','aerobicTrainingEffect','anaerobicTrainingEffect','activityTrainingLoad','avgPower','maxPower','normPower','averageRunningCadenceInStepsPerMinute','averageBikingCadenceInRevPerMinute','steps','totalSets','totalReps','hrTimeInZone_1','hrTimeInZone_2','hrTimeInZone_3','hrTimeInZone_4','hrTimeInZone_5'];
  return {...Object.fromEntries(keys.filter(k=>k in item).map(k=>[k,item[k]])),activityType:item.activityType?.typeKey??null};
}
export async function garminRequest(path:string,credential:string,method='GET',fetcher:typeof fetch=fetch):Promise<any>{
  let response:Response;
  try{response=await fetcher(BASE+path,{method,redirect:'manual',signal:AbortSignal.timeout(20000),headers:{Authorization:credential,Accept:method==='POST'?'*/*':'application/json'}});}
  catch(e){
    // Classify without recording headers, credentials, response bodies, or exception text.
    const message=e instanceof Error?e.message:'';
    const category=/redirect/i.test(message)?'redirect-runtime':/signal|timeout/i.test(message)?'timeout-runtime':/request context|global scope/i.test(message)?'request-context':'network-or-runtime';
    console.error('Garmin request failed',{category,errorType:e instanceof Error?e.name:'unknown'});
    throw new GarminError(`Garmin could not be reached (${category}). Please try again.`);
  }
  if(response.status>=300&&response.status<400)throw new GarminError('Garmin redirected the request. The connector stopped without forwarding your credentials.');
  if(!response.ok)throw new GarminError(`Garmin returned HTTP ${response.status}.${[401,403].includes(response.status)?' Your key may need replacing.':''}`);
  const text=await response.text();
  if(method==='POST'){const token=text.trim().replace(/^"|"$/g,'');if(!token||/\s/.test(token))throw new GarminError('Unexpected Garmin token response.');return token;}
  try{return text.trim()?JSON.parse(text):null;}catch{throw new GarminError('Unexpected Garmin data response.');}
}
export async function verifyKey(key:string,fetcher:typeof fetch=fetch){return garminRequest(TOKEN_PATH,'ApiKey '+key,'POST',fetcher);}
export function dateWindow(days:number,now=new Date()){
  const end=new Intl.DateTimeFormat('en-CA',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const first=new Date(end+'T12:00:00Z');first.setUTCDate(first.getUTCDate()-days+1);
  return {start:first.toISOString().slice(0,10),end};
}
export async function fetchContext(key:string,days:number,fetcher:typeof fetch=fetch){
  const {start,end}=dateWindow(days);return fetchRange(key,start,end,[...SECTIONS],fetcher);
}
export async function fetchRange(key:string,start:string,end:string,sectionsRequested:Section[]=[...SECTIONS],fetcher:typeof fetch=fetch){
  const token='Bearer '+await verifyKey(key,fetcher);
  const query=new URLSearchParams({startDate:start,endDate:end});
  const tasks:Record<string,()=>Promise<any>>={
    activities:async()=>{
      const found=new Map();
      for(let offset=0;offset<5000;offset+=100){
        const payload=await garminRequest(`/activitylist-service/activities/search/activities?${query}&start=${offset}&limit=100`,token,'GET',fetcher);
        const items=Array.isArray(payload)?payload:payload?.activities??payload?.data;
        if(!Array.isArray(items))throw new GarminError('Unexpected activity response.');
        for(const item of items){if(!item?.activityId)throw new GarminError('An activity has no identifier.');found.set(item.activityId,activityMetrics(item));}
        if(items.length<100)return [...found.values()];
      }
      throw new GarminError('Too many workouts; request a shorter date range.');
    },
    daily:async()=>selectMetrics(await garminRequest(`/usersummary-service/v2/dailysummaries?${query}`,token,'GET',fetcher)),
    sleep:async()=>selectMetrics(await garminRequest(`/sleep-service/sleep/dailySleepSummariesByDate?${query}`,token,'GET',fetcher)),
    hrv:async()=>selectMetrics(await garminRequest(`/hrv-service/hrv/daily/${start}/${end}`,token,'GET',fetcher)),
    body_battery:async()=>{
      const payload=await garminRequest(`/wellness-service/wellness/bodyBattery/reports/daily?${query}`,token,'GET',fetcher);
      return Array.isArray(payload)?payload.map((v:any)=>{const values=(v.bodyBatteryValuesArray??[]).map((x:any)=>Array.isArray(x)?x[1]:null).filter((x:any)=>typeof x==='number'&&x>=0);return {...selectMetrics(v),minimum:values.length?Math.min(...values):null,maximum:values.length?Math.max(...values):null,latest:values.at(-1)??null};}):selectMetrics(payload);
    },
  };
  const entries=await Promise.all(Object.entries(tasks).filter(([name])=>sectionsRequested.includes(name as Section)).map(async([name,run])=>{try{return [name,{status:'fetched',metrics:await run()}];}catch(e){return [name,{status:'unavailable',error:e instanceof GarminError?e.message:'This section could not be fetched.'}];}}));
  const sections=Object.fromEntries(entries);
  const complete=Object.values(sections).every((x:any)=>x.status==='fetched');
  return {source:'Garmin Personal API',fetched_at_utc:new Date().toISOString(),range:{start,end,timezone:TIME_ZONE,inclusive:true},sync_status:complete?'complete':'partial',units:{distance:'meters',duration:'seconds',speed:'meters/second',heart_rate:'beats/minute'},notes:['Today may be incomplete. Missing values are unknown, not zero.','Garmin data is current only through your latest device sync.','Daily energy totals may already include workout energy; do not sum them again.','No food logs, GPS routes, workout names, or profile identifiers are included.'],sections};
}

export function compactDaily(context:any,now=new Date()){
  const cutoff=now.getTime()-24*60*60*1000;
  const sections=Object.fromEntries(Object.entries(context.sections).map(([name,raw])=>{
    const section=raw as any;if(section.status!=='fetched')return [name,section];
    if(name==='activities')return [name,{...section,metrics:section.metrics.filter((v:any)=>{
      const stamp=v.startTimeGMT;if(typeof stamp!=='string')return false;
      const time=Date.parse(/Z$|[+-]\d\d:\d\d$/.test(stamp)?stamp:stamp.replace(' ','T')+'Z');
      return time>=cutoff&&time<=now.getTime();
    })}];
    let values=section.metrics;
    if(values&&typeof values==='object'&&!Array.isArray(values))values=values.data??values.hrvSummaries??values.dailySleepSummaries??[values];
    if(!Array.isArray(values))values=[];
    const available=values.filter((v:any)=>v&&typeof v==='object').sort((a:any,b:any)=>String(a.calendarDate??a.date??'').localeCompare(String(b.calendarDate??b.date??'')));
    return [name,{...section,metrics:available.length?available[available.length-1]:null}];
  }));
  return {...context,mode:'latest_daily_update',lookback_hours:24,sections,notes:[...context.notes,'Wellness contains the latest available daily record in the two-calendar-day fetch window; its date may be yesterday. Activities cover the rolling last 24 hours. This is a fresh snapshot, not a cross-chat change feed.']};
}

export async function fetchActivities(key:string,start:string,end:string,offset=0,limit=50,activityType?:string,fetcher:typeof fetch=fetch){
  validateDate(start);validateDate(end);if(start>end||end>dateWindow(1).end)throw new GarminError('Use an ordered date range ending no later than today.');
  const token='Bearer '+await verifyKey(key,fetcher);
  const query=new URLSearchParams({startDate:start,endDate:end,start:String(offset),limit:String(limit)});if(activityType)query.set('activityType',activityType);
  const payload=await garminRequest('/activitylist-service/activities/search/activities?'+query,token,'GET',fetcher);
  const items=Array.isArray(payload)?payload:payload?.activities??payload?.data;if(!Array.isArray(items))throw new GarminError('Unexpected activity response.');
  return {source:'Garmin Personal API',fetched_at_utc:new Date().toISOString(),range:{start,end},activities:items.map(activityMetrics),next_offset:items.length===limit?offset+limit:null,notes:['Garmin historical availability varies by account. Follow next_offset to retrieve more. Distances: meters; durations and zone times: seconds; speeds: meters/second.']};
}
const detailFields=new Set(`startTimeLocal startTimeGMT distance duration movingDuration elapsedDuration elevationGain elevationLoss maxElevation minElevation avgElevation averageSpeed averageMovingSpeed maxSpeed calories bmrCalories averageHR maxHR minHR averageRunCadence maxRunCadence maxLapAvgRunCadence averageBikeCadence maxBikeCadence averageSwimCadence maxSwimCadence averageTemperature maxTemperature minTemperature averagePower maxPower maxPowerTwentyMinutes minPower normalizedPower functionalThresholdPower totalWork leftBalance rightBalance groundContactTime groundContactBalanceLeft strideLength verticalOscillation verticalRatio trainingEffect anaerobicTrainingEffect trainingStressScore intensityFactor poolLength numberOfActiveLengths totalNumberOfStrokes averageStrokes minimumStrokes averageSWOLF minSWOLF strokeDistance distancePerStroke strokeCadence averageStrokeDistance averageStrokeCadence maxStrokeCadence totalExerciseReps totalReps totalSets activeSets maxLapRepCount floorsClimbed floorsDescended perceivedWorkoutEffort waterEstimated waterConsumed minRespirationRate maxRespirationRate avgRespirationRate trainingEffectLabel activityTrainingLoad minActivityLapDuration startStress endStress differenceStress directWorkoutFeel directWorkoutRpe directWorkoutComplianceScore targetDuration targetDistance targetAverageSpeed moderateIntensityMinutes vigorousIntensityMinutes steps avgStress maxStress recoveryHeartRate beginPotentialStamina endPotentialStamina minAvailableStamina avgGradeAdjustedSpeed differenceBodyBattery impactLoad messageIndex splitType noOfSplits averagePowerTarget`.split(' '));
for(const name of ['SummaryDTO','SplitSummaryDTO'])for(const [k,schema]of Object.entries(HEALTH_SCHEMAS[name].properties) as [string,any][])if(['number','integer','boolean'].includes(schema.type))detailFields.add(k);
function measuredFields(item:any){return item&&typeof item==='object'?Object.fromEntries(Object.entries(item).filter(([k,v])=>detailFields.has(k)&&(v===null||['string','number','boolean'].includes(typeof v)))):{};}
export function detailMetrics(payload:any){
  return {activityId:payload.activityId,activityType:payload.activityTypeDTO?.typeKey??payload.activityType?.typeKey??null,summary:measuredFields(payload.summaryDTO??payload),split_summaries:Array.isArray(payload.splitSummaries)?payload.splitSummaries.map(measuredFields):[]};
}
function workoutMetrics(payload:any):any{
  if(Array.isArray(payload))return payload.map(workoutMetrics);
  if(!payload||typeof payload!=='object')return payload;
  const allowed=new Set(['index','sport','multisportSet','steps','stepIndex','intensity','durationType','durationValue','targetType','targetValue','targetValueLow','targetValueHigh','equipmentType','exerciseCategory','exerciseName','exerciseWeightValue','weightDisplayUnit']);
  return Object.fromEntries(Object.entries(payload).filter(([k])=>allowed.has(k)).map(([k,v])=>[k,workoutMetrics(v)]));
}
export async function fetchActivityDetails(key:string,id:string,includeWorkouts=true,fetcher:typeof fetch=fetch){
  if(!/^[1-9]\d{0,19}$/.test(id))throw new GarminError('activity_id must be a positive Garmin activity identifier.');
  const token='Bearer '+await verifyKey(key,fetcher);
  const payload=await garminRequest(`/activity-service/activity/${id}`,token,'GET',fetcher);
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new GarminError('Unexpected activity detail response.');
  const result:any={source:'Garmin Personal API',fetched_at_utc:new Date().toISOString(),...detailMetrics(payload),units:{distance:'meters',duration:'seconds',speed:'meters/second',heart_rate:'beats/minute',power:'watts'},notes:['Only fields Garmin returned are present. Missing measurements are unknown.','Split summaries may be grouped intervals, not individual lap records. Raw FIT time series are not decoded.','Associated workout steps describe instructions and targets, not proof that every target was completed.','GPS coordinates, routes, account identifiers, names, and free-text notes are excluded.']};
  if(includeWorkouts){try{result.associated_workouts={status:'fetched',data:workoutMetrics(await garminRequest(`/activity-service/activity/${id}/workouts`,token,'GET',fetcher))};}catch(e){result.associated_workouts={status:'unavailable',error:e instanceof GarminError?e.message:'Could not fetch associated workouts.'};}}
  return result;
}
