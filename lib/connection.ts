import { env } from 'cloudflare:workers';
import { getDb } from '../db';
import { connections } from '../db/schema';
import { eq } from 'drizzle-orm';
import { fetchContext,GarminError,dateWindow,compactDaily,fetchRange,historyWindow,fetchActivities,fetchActivityDetails,type Section } from './garmin';
import { encryptKey,decryptKey } from './key-crypto';
import { fetchExtendedHealth,type ExtendedCategory } from './extended-health';
function secret(){const value=(env as unknown as Record<string,string>).GARMIN_ENCRYPTION_KEY;if(!value)throw new Error('Server encryption is not configured.');return value;}
export async function getConnection(userId:string){return (await getDb().select().from(connections).where(eq(connections.userId,userId)).limit(1))[0];}
export async function saveConnection(userId:string,key:string){const encryptedKey=await encryptKey(key,userId,secret());await getDb().insert(connections).values({userId,encryptedKey}).onConflictDoUpdate({target:connections.userId,set:{encryptedKey,snapshot:null,fetchedAt:null}});}
export async function removeConnection(userId:string){await getDb().delete(connections).where(eq(connections.userId,userId));}
async function connectedKey(userId:string){const row=await getConnection(userId);if(!row)throw new GarminError('Garmin is not connected. Open the connection site and enter your Personal API key.');return decryptKey(row.encryptedKey,userId,secret());}
async function cachedContext(userId:string,cacheKey:string,force:boolean,fetchData:(key:string)=>Promise<any>){
  const row=await getConnection(userId);if(!row)throw new GarminError('Garmin is not connected. Open the Garmin Health Connection site and enter your Personal API key.');
  const age=row.fetchedAt?Date.now()-Date.parse(row.fetchedAt):Infinity;
  if(!force&&row.snapshot&&age>=0&&age<15*60*1000){const cached=JSON.parse(row.snapshot);if(cached.schema_version===2&&cached.cacheKey===cacheKey&&cached.data.range.end===dateWindow(1).end)return {...cached.data,cache_age_minutes:Math.floor(age/60000),from_cache:true};}
  const data=await fetchData(await decryptKey(row.encryptedKey,userId,secret()));
  await getDb().update(connections).set({snapshot:JSON.stringify({schema_version:2,cacheKey,data}),fetchedAt:data.fetched_at_utc}).where(eq(connections.userId,userId));
  return {...data,from_cache:false,cache_age_minutes:0};
}
export async function healthContext(userId:string,days=1,force=false){return cachedContext(userId,'context:'+days,force,key=>fetchContext(key,days));}
export async function dailyUpdate(userId:string,force=false){return cachedContext(userId,'daily',force,async key=>compactDaily(await fetchContext(key,2)));}
export async function healthHistory(userId:string,start:string,end:string,sections?:Section[]){const window=historyWindow(start,end);return {...await fetchRange(await connectedKey(userId),window.start,window.end,sections),requested_range:{start,end},next_start_date:window.next_start_date,notes:['At most 31 calendar days per call. Follow next_start_date to continue. Garmin determines historical availability. Missing data is unknown, not zero.']};}
export async function activityList(userId:string,start:string,end:string,offset=0,limit=50,type?:string){return fetchActivities(await connectedKey(userId),start,end,offset,limit,type);}
export async function activityDetails(userId:string,id:string,includeWorkouts=true){return fetchActivityDetails(await connectedKey(userId),id,includeWorkouts);}
export async function extendedHealth(userId:string,start:string,end:string,categories?:ExtendedCategory[],includeTimeSeries=false){return fetchExtendedHealth(await connectedKey(userId),start,end,categories,includeTimeSeries);}
