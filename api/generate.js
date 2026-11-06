const TEXT_MODEL = "bytedance/seedance-2.0/fast/text-to-video";
const IMAGE_MODEL = "bytedance/seedance-2.0/fast/image-to-video";
const json = (res, status, body) => res.status(status).setHeader("Content-Type","application/json").send(JSON.stringify(body));
async function verifyUser(req) {
  const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");
  if(!token) return false;
  const url=process.env.VITE_SUPABASE_URL;
  const key=process.env.VITE_SUPABASE_ANON_KEY;
  if(!url||!key) return false;
  const r=await fetch(url+"/auth/v1/user",{headers:{apikey:key,Authorization:"Bearer "+token}});
  return r.ok;
}
export default async function handler(req,res) {
  if(req.method!=="POST" && req.method!=="GET") return json(res,405,{error:"Method not allowed"});
  try {
    if(!(await verifyUser(req))) return json(res,401,{error:"Hyr në llogarinë tënde për të krijuar video."});
    if(req.method==="GET" && req.query?.health==="1") return json(res,200,{provider:"fal.ai · Seedance 2.0 Fast",configured:Boolean(process.env.FAL_KEY)});
    const falKey=process.env.FAL_KEY;
    if(!falKey) return json(res,503,{error:"Mungon FAL_KEY në Vercel. Shto çelësin e fal.ai te Environment Variables."});
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