const encoder=new TextEncoder();
function b64(data:Uint8Array){return btoa(String.fromCharCode(...data));}
function bytes(text:string){return Uint8Array.from(atob(text),c=>c.charCodeAt(0));}
async function cipherKey(secret:string){return crypto.subtle.importKey('raw',bytes(secret),'AES-GCM',false,['encrypt','decrypt']);}
export async function encryptKey(value:string,userId:string,secret:string){const iv=crypto.getRandomValues(new Uint8Array(12));const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(userId)},await cipherKey(secret),encoder.encode(value));return b64(iv)+'.'+b64(new Uint8Array(ciphertext));}
export async function decryptKey(ciphertext:string,userId:string,secret:string){const [iv,data]=ciphertext.split('.');const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv),additionalData:encoder.encode(userId)},await cipherKey(secret),bytes(data));return new TextDecoder().decode(plain);}
