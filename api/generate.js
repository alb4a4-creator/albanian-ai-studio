const TEXT_MODEL = "bytedance/seedance-2.0/fast/text-to-video";
const IMAGE_MODEL = "bytedance/seedance-2.0/fast/image-to-video";
const json = (res, status, body) => res.status(status).setHeader("Content-Type","application/json").send(JSON.stringify(body));
async function verifyUser(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  const token = (authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : authHeader).trim();
  if (!token) return { ok: false, reason: "Mungon token-i i hyrjes. Dil nga llogaria dhe hyr përsëri." };

  // These are the same public Supabase project settings used by the browser client.
  // Server-side variables take precedence when configured in Vercel.
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://yjoszxczwmhztwzmaqhy.supabase.co").replace(/\/$/, "");
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!key) return { ok: false, reason: "Mungon VITE_SUPABASE_ANON_KEY në Vercel. Kontrollo Environment Variables dhe bëj Redeploy." };

  const response = await fetch(url + "/auth/v1/user", {
    headers: { apikey: key, Authorization: "Bearer " + token }
  });
  if (response.ok) return { ok: true };
  if (response.status === 401 || response.status === 403) return { ok: false, reason: "Sesioni ka skaduar ose nuk i përket projektit Supabase. Dil nga llogaria dhe hyr përsëri." };
  return { ok: false, reason: "Supabase nuk mundi të verifikojë hyrjen (HTTP " + response.status + ")." };
}
export default async function handler(req,res) {
  if(req.method!=="POST" && req.method!=="GET") return json(res,405,{error:"Method not allowed"});
  try {
    const auth = await verifyUser(req);
    if (!auth.ok) return json(res, 401, { error: auth.reason });
    if(req.method==="GET" && req.query?.health==="1") return json(res,200,{provider:"fal.ai · Seedance 2.0 Fast",configured:Boolean(process.env.FAL_KEY)});
    const falKey=process.env.FAL_KEY;
    if(!falKey) return json(res,503,{error:"Motori AI nuk është konfiguruar ende."});
    // Safety gate: never expose an unmetered public generation endpoint.
    // Enable only after credits, quotas, and customer billing are enforced server-side.
    if(req.method==="POST" && process.env.GENERATION_BILLING_ENABLED!=="true") return json(res,503,{error:"Gjenerimi i videove do të aktivizohet pasi të vendoset sistemi i krediteve dhe kufijtë e përdorimit."});
    if(req.method==="POST") {
      const {prompt,mode,duration,ratio,imageData}=req.body||{};
      if(typeof prompt!=="string"||prompt.trim().length<3||prompt.length>4000) return json(res,400,{error:"Përshkrimi duhet të ketë 3–4000 karaktere."});
      if(!["text","image"].includes(mode)) return json(res,400,{error:"Modalitet i pavlefshëm."});
      if(mode==="image" && (typeof imageData!=="string"||!/^data:image\/(png|jpeg|webp);base64,/.test(imageData)||imageData.length>5_000_000)) return json(res,400,{error:"Ngarko një fotografi të vlefshme, deri në rreth 3.5 MB."});
      const seconds=String(Math.max(4,Math.min(15,Number(duration)||5)));
      const aspect=["16:9","9:16","1:1","4:3","3:4","21:9"].includes(ratio)?ratio:"16:9";
      const model=mode==="image"?IMAGE_MODEL:TEXT_MODEL;
      const input={prompt:prompt.trim(),resolution:"720p",duration:seconds,aspect_ratio:aspect,generate_audio:true};
      if(mode==="image") input.image_url=imageData;
      const r=await fetch("https://queue.fal.run/"+model,{method:"POST",headers:{Authorization:"Key "+falKey,"Content-Type":"application/json"},body:JSON.stringify(input)});
      const data=await r.json().catch(()=>({}));
      if(!r.ok) return json(res,r.status,{error:data.detail||data.message||"Shërbimi i videos nuk e pranoi kërkesën."});
      return json(res,202,{requestId:data.request_id,model,status:"IN_QUEUE"});
    }
    const requestId=String(req.query?.requestId||"");
    const model=String(req.query?.model||"");
    if(!/^[0-9a-f-]{20,}$/i.test(requestId)||![TEXT_MODEL,IMAGE_MODEL].includes(model)) return json(res,400,{error:"Kërkesë e pavlefshme."});
    const base="https://queue.fal.run/"+model+"/requests/"+encodeURIComponent(requestId);
    const statusRes=await fetch(base+"/status",{headers:{Authorization:"Key "+falKey}});
    const statusData=await statusRes.json().catch(()=>({}));
    if(!statusRes.ok) return json(res,statusRes.status,{error:statusData.detail||"Nuk u lexua statusi i videos."});
    if(statusData.status==="COMPLETED") {
      const resultRes=await fetch(base,{headers:{Authorization:"Key "+falKey}});
      const result=await resultRes.json().catch(()=>({}));
      if(!resultRes.ok) return json(res,resultRes.status,{error:result.detail||"Videoja nuk mund të merret."});
      const videoUrl=result.video?.url||result.output?.video?.url;
      if(!videoUrl) return json(res,502,{error:"Gjenerimi përfundoi, por shërbimi nuk ktheu lidhjen e videos."});
      return json(res,200,{status:"COMPLETED",videoUrl});
    }
    if(statusData.status==="FAILED") return json(res,502,{status:"FAILED",error:statusData.error||"Gjenerimi i videos dështoi."});
    return json(res,200,{status:statusData.status||"IN_PROGRESS",logs:statusData.logs||[]});
  } catch(err) {
    console.error("Video generation API error",err);
    return json(res,500,{error:"Gabim i brendshëm gjatë krijimit të videos."});
  }
}