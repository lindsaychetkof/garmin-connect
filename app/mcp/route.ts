import { healthContext,getConnection,dailyUpdate,healthHistory,activityList,activityDetails,extendedHealth } from '../../lib/connection';
import { GarminError } from '../../lib/garmin';
import { TOOLS,PROJECT_INSTRUCTIONS,validateArguments } from '../../lib/tool-contract';
export async function POST(req:Request){
  let input:any;try{input=await req.json();}catch{return Response.json({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Invalid JSON.'}},{status:400});}
  if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.method!=='string')return Response.json({jsonrpc:'2.0',id:null,error:{code:-32600,message:'Invalid JSON-RPC request.'}},{status:400});
  const reply=(result:unknown)=>Response.json({jsonrpc:'2.0',id:input.id??null,result},{headers:{'Cache-Control':'no-store'}});
  const fail=(code:number,message:string)=>Response.json({jsonrpc:'2.0',id:input.id??null,error:{code,message}},{headers:{'Cache-Control':'no-store'}});
  if(input.method==='server/discover')return reply({supportedVersions:['2026-07-28'],capabilities:{tools:{}}});
  if(input.method==='initialize')return reply({protocolVersion:['2026-07-28','2025-06-18'].includes(input.params?.protocolVersion)?input.params.protocolVersion:'2026-07-28',capabilities:{tools:{}},serverInfo:{name:'garmin-health-connection',version:'3.0.0'},instructions:PROJECT_INSTRUCTIONS});
  if(input.method==='notifications/initialized'||input.id===undefined)return new Response(null,{status:202});
  if(input.method==='ping')return reply({});if(input.method==='tools/list')return reply({tools:TOOLS});if(input.method!=='tools/call')return fail(-32601,'Method not found.');
  const userId=req.headers.get('oai-authenticated-user-id');if(!userId)return reply({isError:true,content:[{type:'text',text:'Sign in to Garmin Health Connection before accessing health data.'}]});
  try{
    let args;try{args=validateArguments(input.params?.name,input.params?.arguments);}catch(e){return fail(-32602,e instanceof GarminError?e.message:'Invalid arguments.');}
    let data:unknown;
    if(input.params?.name==='get_extended_health_data'){
      data=await extendedHealth(userId,args.start_date,args.end_date,args.categories,args.include_time_series??false);
    }else if(input.params?.name==='get_health_context'){
      data=await healthContext(userId,args.days??1,args.force_refresh??false);
    }else if(input.params?.name==='get_daily_update'){
      data=await dailyUpdate(userId,args.force_refresh??false);
    }else if(input.params?.name==='get_health_history'){
      data=await healthHistory(userId,args.start_date,args.end_date,args.sections);
    }else if(input.params?.name==='get_activities'){
      data=await activityList(userId,args.start_date,args.end_date,args.offset??0,args.limit??50,args.activity_type);
    }else if(input.params?.name==='get_activity_details'){
      data=await activityDetails(userId,args.activity_id,args.include_workouts??true);
    }else if(input.params?.name==='get_connection_status'){const row=await getConnection(userId);data={connected:!!row,last_fetched_at_utc:row?.fetchedAt??null};}
    else{return fail(-32602,'Unknown tool.');}
    return reply({content:[{type:'text',text:JSON.stringify(data)}]});
  }catch(e){return reply({isError:true,content:[{type:'text',text:e instanceof GarminError?e.message:'Health context could not be loaded. No stale data has been substituted. Please try again or check the connection site.'}]});}
}
