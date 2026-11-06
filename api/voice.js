const json=(res,status,body)=>res.status(status).setHeader("Content-Type","application/json").send(JSON.stringify(body));
async function verifyUser(req){
 const header=req.headers.authorization||"";
 const token=header.toLowerCase().startsWith("bearer ")?header.slice(7).trim():"";
 if(!token)return {ok:false};
 const url=(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||"https://yjoszxczwmhztwzmaqhy.supabase.co").replace(/\/$/,"");
 const key=process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY;
 if(!key)return {ok:false};
 const r=await fetch(url+"/auth/v1/user",{headers:{apikey:key,Authorization:"Bearer "+token}});
 return {ok:r.ok};
}
export default async function handler(req,res){
 if(req.method!=="GET"&&req.method!=="POST")return json(res,405,{error:"Method not allowed"});
 try{
  const auth=await verifyUser(req);
  if(!auth.ok)return json(res,401,{error:"Hyr në llogarinë tënde dhe provo përsëri."});
  const key=process.env.ELEVENLABS_API_KEY;
  if(!key)return json(res,503,{error:"Motori i zërit nuk është konfiguruar. Shto ELEVENLABS_API_KEY te Vercel → Settings → Environment Variables dhe bëj Redeploy."});
  if(req.method==="GET"){
   if(req.query?.voices!=="1")return json(res,400,{error:"Kërkesë e pavlefshme."});
   const r=await fetch("https://api.elevenlabs.io/v1/voices?page_size=100",{headers:{"xi-api-key":key}});
   const d=await r.json().catch(()=>({}));
   if(!r.ok)return json(res,r.status,{error:d.detail?.message||d.detail||"Lista e zërave nuk mund të merret."});
   return json(res,200,{voices:(d.voices||[]).map(v=>({voice_id:v.voice_id,name:v.name,category:v.category,labels:v.labels||{}}))});
  }
  const {text,voiceId,language}=req.body||{};
  if(typeof text!=="string"||!text.trim()||text.length>3000)return json(res,400,{error:"Shkruaj tekst deri në 3.000 karaktere."});
  if(typeof voiceId!=="string"||! /^[a-zA-Z0-9_-]{8,80}$/.test(voiceId))return json(res,400,{error:"Zgjidh një zë të vlefshëm."});
  const languages=["sq","de","en","it","fr","es","tr","mk"];
  if(!languages.includes(language))return json(res,400,{error:"Gjuha e zgjedhur nuk mbështetet."});
  const r=await fetch("https://api.elevenlabs.io/v1/text-to-speech/"+encodeURIComponent(voiceId)+"?output_format=mp3_44100_128",{
   method:"POST",headers:{"xi-api-key":key,"Content-Type":"application/json","Accept":"audio/mpeg"},
   body:JSON.stringify({text:text.trim(),model_id:"eleven_v3",language_code:language})
  });
  if(!r.ok){const d=await r.json().catch(()=>({}));const detail=d.detail?.message||d.detail||d.message;return json(res,r.status,{error:typeof detail==="string"?detail:"Ofruesi i zërit nuk e pranoi kërkesën. Kontrollo kreditet dhe kufijtë e llogarisë ElevenLabs."});}
  const audio=Buffer.from(await r.arrayBuffer());
  res.setHeader("Content-Type","audio/mpeg");res.setHeader("Content-Disposition",'attachment; filename="albanian-ai-studio-voice.mp3"');res.setHeader("Cache-Control","no-store");
  return res.status(200).send(audio);
 }catch(err){console.error("AI voice API error",err);return json(res,500,{error:"Gabim i brendshëm gjatë krijimit të audios."});}
}