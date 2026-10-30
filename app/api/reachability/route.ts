import { BASE,TOKEN_PATH } from '../../../lib/garmin';
export const dynamic='force-dynamic';
// Fixed-destination probe. Never uses or returns a user key or health data.
// The owner-private Sites gateway protects this diagnostic endpoint as well.
export async function GET(){
  const probes=[];
  for(const mode of ['manual','error'] as const){
    try{
      const result=await fetch(BASE+TOKEN_PATH,{method:'POST',redirect:mode,signal:AbortSignal.timeout(10000),headers:{Accept:'*/*',Authorization:'ApiKey diagnostic-placeholder-not-a-real-key'}});
      probes.push({redirect:mode,reached:true,status:result.status});
      await result.body?.cancel();
    }catch(e){
      const message=e instanceof Error?e.message:'';
      // No real credentials are involved; report only fixed recognized runtime errors.
      const reason=/redirect/i.test(message)?'redirect-mode-rejected':/signal|timeout/i.test(message)?'timeout-or-signal':/request context|global scope/i.test(message)?'request-context':'network-or-runtime';
      probes.push({redirect:mode,reached:false,reason,errorType:e instanceof Error?e.name:'unknown'});
    }
  }
  return Response.json({probes},{headers:{'Cache-Control':'no-store'}});
}
