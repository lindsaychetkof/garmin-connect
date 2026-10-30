import { HEALTH_SCHEMAS } from './health-schema';
import { GarminError,garminRequest,verifyKey,historyWindow,dateWindow } from './garmin';
import { TIME_ZONE } from './config';

export const EXTENDED_CATEGORIES=['body_composition','fitness_age','heart_rate_zones','hydration','nutrition','menstrual_cycle','spo2','heart_rate','steps','stress','weight_goals','wellness_activities','settings'] as const;
export type ExtendedCategory=typeof EXTENDED_CATEGORIES[number];

// Project against documented field/type schemas, never export arbitrary response keys.
export function projectHealth(value:any,schema:any,includeTimeSeries=false,key='',depth=0):any{
  if(depth>20)return undefined;
  if(!includeTimeSeries&&/(Values|DescriptorList|ValueDescriptors|HourlyAverages|ValuesArray)$/.test(key))return undefined;
  if(value===null)return null;
  if(schema.ref){
    if(['ConnectDate','ConnectTimestamp'].includes(schema.ref)&&typeof value==='string')return /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)?value:undefined;
    return projectHealth(value,HEALTH_SCHEMAS[schema.ref],includeTimeSeries,key,depth+1);
  }
  if(schema.type==='array')return Array.isArray(value)?value.map(v=>projectHealth(v,schema.items,includeTimeSeries,key,depth+1)).filter(v=>v!==undefined):undefined;
  if(schema.type==='object'){
    // Garmin documents numeric matrix cells as object; permit numeric/null cells only.
    if(!schema.properties&&!schema.additional)return typeof value==='number'&&Number.isFinite(value)?value:null;
    if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
    const entries=Object.entries(value).filter(([k])=>Object.hasOwn(schema.properties??{},k)||(schema.additional&&/^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(k)));
    return Object.fromEntries(entries.map(([k,v])=>[k,projectHealth(v,schema.properties?.[k]??schema.additional,includeTimeSeries,k,depth+1)]).filter(([,v])=>v!==undefined));
  }
  if(schema.type==='number'||schema.type==='integer')return typeof value==='number'&&Number.isFinite(value)?value:undefined;
  if(schema.type==='boolean')return typeof value==='boolean'?value:undefined;
  if(schema.type==='string')return typeof value==='string'&&value.length<=256&&(!schema.enum||schema.enum.includes(value))?value:undefined;
  return undefined;
}

export function extendedWindow(start:string,end:string,days=7){
  historyWindow(start,end);
  const boundary=new Date(start+'T12:00:00Z');boundary.setUTCDate(boundary.getUTCDate()+days-1);
  const last=boundary.toISOString().slice(0,10)<end?boundary.toISOString().slice(0,10):end;
  const next=new Date(last+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);
  return {start,end:last,next_start_date:last<end?next.toISOString().slice(0,10):null};
}
export async function fetchExtendedHealth(key:string,start:string,end:string,categories:ExtendedCategory[]=[...EXTENDED_CATEGORIES],includeTimeSeries=false,fetcher:typeof fetch=fetch){
  const window=extendedWindow(start,end,includeTimeSeries?1:7), token='Bearer '+await verifyKey(key,fetcher);
  const dates:string[]=[];
  for(let day=window.start;day<=window.end;){dates.push(day);const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);day=d.toISOString().slice(0,10);}
  const definitions:Record<ExtendedCategory,{schema:string;array?:boolean;perDay?:boolean;path:(day:string)=>string;asOf?:string}>={
    body_composition:{schema:'DateWeightDTO',array:true,path:()=>`/weight-service/weight/all/${window.start}/${window.end}`},
    fitness_age:{schema:'FitnessAgeDTO',array:true,asOf:window.end,path:()=>`/fitnessage-service/fitnessage/v2/${window.end}?fullHistoryScan=true`},
    heart_rate_zones:{schema:'HeartRateZonesDTO',array:true,asOf:'current_configuration',path:()=>'/biometric-service/heartRateZones/v2?generateDefaults=false'},
    hydration:{schema:'UserDailyHydrationDTO',array:true,path:()=>`/usersummary-service/stats/hydration/daily/${window.start}/${window.end}`},
    nutrition:{schema:'DailyNutritionSummaryDTO',perDay:true,path:day=>`/nutrition-service/food/logs/${day}?includeGoals=true&includeNutrition=true&includeMedia=false`},
    menstrual_cycle:{schema:'DetailedMenstrualCycleDayDTO',perDay:true,path:day=>`/periodichealth-service/menstrualcycle/dayview/${day}?todayDate=${dateWindow(1).end}&includeAnalysis=true`},
    spo2:{schema:'DailySpO2AndAcclimationDTO',perDay:true,path:day=>`/wellness-service/wellness/daily/spo2acclimation/${day}`},
    heart_rate:{schema:'DailyHeartRateDTO',perDay:true,path:day=>`/wellness-service/wellness/dailyHeartRate?date=${day}`},
    steps:{schema:'StepsDailyStatDTO',array:true,path:()=>`/usersummary-service/stats/steps/daily/${window.start}/${window.end}`},
    stress:{schema:'MultiValueWellnessChartItemDTO',array:true,path:()=>`/usersummary-service/stats/stress/daily/${window.start}/${window.end}`},
    weight_goals:{schema:'UserGoalsRangeDTO',path:()=>`/goal-service/goal/user/effective/weightgoal/${window.start}/${window.end}`},
    wellness_activities:{schema:'WellnessActivitySummaryDTO',array:true,path:()=>`/wellnessactivity-service/activity/summary/range/${window.start}/${window.end}`},
    settings:{schema:'UserSettingsDTO',asOf:'current_configuration',path:()=>'/userprofile-service/userprofile/settings'},
  };
  const tasks=categories.flatMap(category=>{
    const def=definitions[category];if(!def)throw new GarminError('Unknown extended health category.');
    return (def.perDay?dates:[window.end]).map(day=>({category,def,day}));
  });
  const records:Record<string,any[]>={};let cursor=0;
  // Bound in-flight requests and keep per-record errors, so a missing day cannot hide valid days.
  await Promise.all(Array.from({length:Math.min(4,tasks.length)},async()=>{
    while(cursor<tasks.length){const {category,def,day}=tasks[cursor++];let record:any;
      try{
        let payload=await garminRequest(def.path(day),token,'GET',fetcher);
        // Garmin's schema says array, but production also returns a single FitnessAgeDTO.
        if(category==='fitness_age'&&payload&&typeof payload==='object'&&!Array.isArray(payload)&&Object.keys(payload).some(k=>Object.hasOwn(HEALTH_SCHEMAS.FitnessAgeDTO.properties,k)))payload=[payload];
        if(payload!==null&&((def.array&&!Array.isArray(payload))||(!def.array&&(typeof payload!=='object'||Array.isArray(payload)))))throw new GarminError('Unexpected health response shape.');
        const shape=def.array?{type:'array',items:{ref:def.schema}}:{ref:def.schema};
        record={status:'fetched',...(def.perDay?{calendar_date:day}:{}),...(def.asOf?{as_of:def.asOf}:{}),metrics:projectHealth(payload,shape,includeTimeSeries)};
      }catch(e){record={status:'unavailable',...(def.perDay?{calendar_date:day}:{}),error:e instanceof GarminError?e.message:'This category could not be fetched.'};}
      (records[category]??=[]).push(record);
    }
  }));
  for(const list of Object.values(records))list.sort((a,b)=>String(a.calendar_date??'').localeCompare(String(b.calendar_date??'')));
  return {source:'Garmin Personal API',fetched_at_utc:new Date().toISOString(),range:{start:window.start,end:window.end,timezone:TIME_ZONE,inclusive:true},requested_range:{start,end},next_start_date:window.next_start_date,categories:records,sync_status:Object.values(records).flat().every(v=>v.status==='fetched')?'complete':'partial',includes_time_series:includeTimeSeries,units:{body_weight:'kilograms',weight_goals:'grams',hydration:'milliliters',heart_rate:'beats/minute',spo2:'percent',nutrition_energy:'kcal',nutrition_macronutrients:'grams',other_metrics:'Garmin field units; no inferred conversions'},notes:['Missing or unsupported categories are unavailable, not zero. Empty records mean Garmin returned no measurements.','Up to seven days per call, or one day with time series. Follow next_start_date for older/longer ranges. Current configuration fields are not historical measurements. Fitness age is the latest available as of the page end date.','Cycle estimates and fertile-window predictions are Garmin estimates, not confirmed ovulation or contraception guidance.','Nutrition contains nutrient totals and goals, not food names, photos, or free-text notes. No GPS routes or account identifiers.','VO2 max, training readiness and other fields absent from the documented Personal API cannot be invented. Raw activity FIT files are not decoded.']};
}
