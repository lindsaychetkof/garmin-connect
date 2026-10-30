import { getChatGPTUser } from '../../chatgpt-auth';
import { getConnection,saveConnection,removeConnection } from '../../../lib/connection';
import { verifyKey,GarminError } from '../../../lib/garmin';
export const dynamic='force-dynamic';
function json(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store'}});}
function sameOrigin(req:Request){return req.headers.get('origin')===new URL(req.url).origin;}
export async function GET(){const user=await getChatGPTUser();if(!user)return json({error:'Sign in required.'},401);const row=await getConnection(user.userId);return json({connected:!!row,fetchedAt:row?.fetchedAt??null});}
export async function POST(req:Request){
  const user=await getChatGPTUser();if(!user)return json({error:'Sign in required.'},401);if(!sameOrigin(req))return json({error:'Invalid request origin.'},403);
  if(Number(req.headers.get('content-length')||0)>8192)return json({error:'Request too large.'},413);
  try{const text=await req.text();if(text.length>8192)return json({error:'Request too large.'},413);const body=JSON.parse(text);const key=typeof body.key==='string'?body.key.trim():'';if(!key||key.length>4096||/\s/.test(key))return json({error:'Enter a valid Garmin Personal API key.'},400);await verifyKey(key);await saveConnection(user.userId,key);return json({connected:true});}
  catch(e){return json({error:e instanceof GarminError?e.message:'Could not save the connection. Please try again.'},400);}
}
export async function DELETE(req:Request){const user=await getChatGPTUser();if(!user)return json({error:'Sign in required.'},401);if(!sameOrigin(req))return json({error:'Invalid request origin.'},403);await removeConnection(user.userId);return json({connected:false});}
