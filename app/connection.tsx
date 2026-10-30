'use client';
import { useEffect, useState } from 'react';
import { PROJECT_INSTRUCTIONS } from '../lib/tool-contract';
export default function Connection() {
  const [key,setKey]=useState(''), [busy,setBusy]=useState(false), [message,setMessage]=useState('');
  const [status,setStatus]=useState<{connected:boolean;fetchedAt:string|null}|null>(null);
  async function load(){try{const r=await fetch('/api/connection',{cache:'no-store'});if(!r.ok)throw Error('Please refresh and sign in again.');setStatus(await r.json());}catch(e){setMessage((e as Error).message);}}
  useEffect(()=>{void load();},[]);
  async function action(method:string,body?:object){
    setBusy(true);setMessage('');
    try{const r=await fetch('/api/connection',{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const result=await r.json() as {error?:string};if(!r.ok)throw Error(result.error||'Could not complete that request.');setKey('');setMessage(method==='DELETE'?'Connection and cached health data removed.':'Garmin verified. Your connection is ready.');await load();}
    catch(e){setMessage((e as Error).message);}finally{setBusy(false);}
  }
  const instructions=PROJECT_INSTRUCTIONS;
  return <main className="gh-shell"><div className="gh-brand"><span className="gh-dot"/> PERSONAL HEALTH CONNECTION</div>
    <h1>Your activity.<br/>In the conversation.</h1><p className="gh-intro">Bring your Garmin workouts and recovery into your existing ChatGPT health project.</p>
    <section className="gh-card"><div className="gh-label">01 / CONNECT GARMIN</div><h2>{status?.connected?'Garmin is connected':'Add your personal API key'}</h2>
      <p>Your key is encrypted on the server. It is never returned to ChatGPT or included in health summaries.</p>
      <form onSubmit={e=>{e.preventDefault();void action('POST',{key});}}><label htmlFor="garmin-key">{status?.connected?'Replace key (optional)':'Garmin Personal API key'}</label><input id="garmin-key" type="password" autoComplete="off" spellCheck={false} value={key} onChange={e=>setKey(e.target.value)} placeholder="Paste your key here" required maxLength={4096}/><button disabled={busy||!key.trim()}>{busy?'Checking Garmin…':status?.connected?'Verify replacement':'Verify and connect'}</button></form>
      {status?.connected&&<div className="gh-connected"><span className="gh-dot"/> Connected · {status.fetchedAt?`Last fetch ${new Date(status.fetchedAt).toLocaleString()}`:'Ready to fetch'}<button className="gh-link" disabled={busy} onClick={()=>void action('DELETE')}>Disconnect & delete data</button></div>}
      {message&&<p role="status" className="gh-message">{message}</p>}
    </section>
    <section className="gh-card"><div className="gh-label">02 / USE IN YOUR HEALTH PROJECT</div><h2>Set it once. Ask normally.</h2><ol><li>Install <strong>Garmin Health Connection</strong> in ChatGPT. Use the same account on your phone.</li><li>Add the instruction below to your existing health project.</li><li>Start a new conversation and ask about your day. Confirm the Garmin tool is used before relying on the data.</li></ol><blockquote>{instructions}</blockquote><button className="gh-secondary" onClick={async()=>{try{await navigator.clipboard.writeText(instructions);setMessage('Project instruction copied.');}catch{setMessage('Select and copy the instruction above.');}}}>Copy project instruction</button></section>
    <section className="gh-card"><div className="gh-label">03 / ASK FOR MORE WHEN YOU NEED IT</div><h2>A daily check-in. History on request.</h2><p>New chats start with your latest wellness record and workouts from the last 24 hours. Older dates and detailed activities are available on demand.</p><ul><li>“Show my sleep and HRV from September 1–30.”</li><li>“Find my runs last month, then show the measured details for the longest one.”</li><li>“Compare this workout’s pace, cadence, power, and split summaries.”</li></ul><p>History is fetched in pages of up to 31 days; ChatGPT can request the next page. Garmin determines how far back your records are available.</p></section>
    <section className="gh-card"><div className="gh-label">04 / SHARE THE CODE</div><h2>Give friends their own private copy.</h2><p>Share the <a href="https://github.com/lindsaychetkof/garmin-connect" target="_blank" rel="noreferrer" style={{textDecoration:'underline'}}>public source repository and setup guide</a>. Each friend deploys their own private connector, generates their own encryption secret, and enters their own Garmin key on their setup page. Your key and records are never part of the shared source.</p><p>Uploading code alone does not host a tool. A coding assistant with Sites access can deploy it and provision the plugin.</p></section>
    <p className="gh-footer">Fetches when called, with a 15-minute cache. Your computer can be off. Opening a blank chat does not itself trigger a fetch; project instructions guide the first reply. The daily update is a current snapshot, not an exact cross-chat “new data only” feed. History and activity details are not stored by the connector. Data returned in chat follows your ChatGPT settings. Read-only access. No GPS routes or workout names are exported.</p>
  </main>;
}
