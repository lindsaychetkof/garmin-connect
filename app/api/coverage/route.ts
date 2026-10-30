import { getChatGPTUser } from '../../chatgpt-auth';
import { extendedHealth } from '../../../lib/connection';
import { dateWindow,GarminError } from '../../../lib/garmin';
export const dynamic='force-dynamic';
export async function POST(req:Request){
  const user=await getChatGPTUser();
  const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
  if(!user)return reply({error:'Sign in required.'},401);
  if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Invalid request origin.'},403);
  try{
    const today=dateWindow(1).end;
    const data=await extendedHealth(user.userId,today,today);
    return reply({date:today,fetched_at_utc:data.fetched_at_utc,categories:Object.fromEntries(Object.entries(data.categories).map(([name,records])=>[name,records.map((r:any)=>({status:r.status,error:r.error,empty:r.metrics==null||JSON.stringify(r.metrics)==='[]'||JSON.stringify(r.metrics)==='{}'}))]))});
  }catch(e){return reply({error:e instanceof GarminError?e.message:'Could not check data coverage.'},400);}
}
