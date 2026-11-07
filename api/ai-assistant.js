const json=(res,status,body)=>res.status(status).setHeader("Content-Type","application/json; charset=utf-8").send(JSON.stringify(body));
async function verifyUser(req){
 const header=req.headers.authorization||"",token=header.toLowerCase().startsWith("bearer ")?header.slice(7).trim():"";
 const url=(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||"").replace(/\/$/,""),key=process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY;
 if(!token||!url||!key)return false;const r=await fetch(url+"/auth/v1/user",{headers:{apikey:key,Authorization:"Bearer "+token}});return r.ok;
}
export default async function handler(req,res){
 if(req.method!=="POST")return json(res,405,{error:"Method not allowed."});
 try{
  if(!await verifyUser(req))return json(res,401,{error:"Sesioni ka skaduar. Dil dhe hyr përsëri."});
  const body=req.body||{},provider=body.provider==="gemini"?"gemini":"openai",prompt=String(body.prompt||"").trim().slice(0,12000);
  if(prompt.length<2)return json(res,400,{error:"Shkruaj një kërkesë."});
  let response,data,answer;
  if(provider==="openai"){
   if(!process.env.OPENAI_API_KEY)return json(res,503,{error:"Mungon OPENAI_API_KEY në Vercel. Kontrollo emrin dhe bëj Redeploy."});
   response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:"Bearer "+process.env.OPENAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-4.1-mini",instructions:"Je asistenti i Albanian AI Studio. Përgjigju qartë në gjuhën e përdoruesit, veçanërisht shqip.",input:prompt,max_output_tokens:1800})});
   data=await response.json().catch(()=>({}));answer=data.output?.flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n")||data.output_text;
  }else{
   if(!process.env.GEMINI_API_KEY)return json(res,503,{error:"Mungon GEMINI_API_KEY në Vercel. Shto çelësin e Google AI Studio dhe bëj Redeploy."});
   response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key="+encodeURIComponent(process.env.GEMINI_API_KEY),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system_instruction:{parts:[{text:"Je asistenti i Albanian AI Studio. Përgjigju qartë në gjuhën e përdoruesit, veçanërisht shqip."}]},contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:1800}})});
   data=await response.json().catch(()=>({}));answer=data.candidates?.[0]?.content?.parts?.map(x=>x.text||"").join("\n");
  }
  if(!response.ok)return json(res,502,{error:String(data.error?.message||"Ofruesi AI ktheu gabim HTTP "+response.status).slice(0,500)});
  if(!answer)return json(res,502,{error:"Modeli nuk ktheu përgjigje. Provo përsëri."});
  return json(res,200,{provider,answer});
 }catch(error){return json(res,500,{error:error.message||"Gabim në server."})}
}