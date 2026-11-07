const json=(res,status,body)=>res.status(status).setHeader("Content-Type","application/json; charset=utf-8").send(JSON.stringify(body));

async function verifyUser(req){
  const header=req.headers.authorization||"";
  const token=header.toLowerCase().startsWith("bearer ")?header.slice(7).trim():header.trim();
  if(!token)return false;
  const url=(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||"").replace(/\/$/,"");
  const key=process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY;
  if(!url||!key)return false;
  const response=await fetch(url+"/auth/v1/user",{headers:{apikey:key,Authorization:"Bearer "+token}});
  return response.ok;
}

export default async function handler(req,res){
  if(req.method!=="POST")return json(res,405,{error:"Method not allowed."});
  if(!process.env.ZAI_API_KEY)return json(res,503,{error:"Mungon ZAI_API_KEY në konfigurimin Production të Vercel."});
  try{
    const authenticated=await verifyUser(req);
    if(!authenticated)return json(res,401,{error:"Sesioni ka skaduar. Dil nga llogaria dhe hyr përsëri."});
    const body=req.body||{};
    const title=String(body.title||"Histori e re").slice(0,160);
    const genre=String(body.genre||"dramë").slice(0,80);
    const premise=String(body.premise||"").trim().slice(0,5000);
    const characters=String(body.characters||"").trim().slice(0,3000);
    const scenes=Math.min(10,Math.max(3,Number(body.scenes)||5));
    if(premise.length<10)return json(res,400,{error:"Shkruaj pak më shumë për idenë e historisë."});
    const prompt=[
      "Krijo një skenar origjinal për një film të shkurtër në gjuhën shqipe.",
      "Shkruaj vetëm në shqip të natyrshme, me dialogë bindës dhe udhëzime filmike të qarta.",
      "Mos jep shpjegime për procesin. Kthe një skenar të plotë, jo një formular me vende bosh.",
      "Struktura: titull, përmbledhje e shkurtër, personazhet me karakterizim, pastaj saktësisht "+scenes+" skena të numëruara.",
      "Për çdo skenë përfshi: vendndodhjen dhe kohën (INT/EXT), atmosferën, veprimin, dialogët me emrat e personazheve dhe një udhëzim të shkurtër për kamerën.",
      "Ruaj vazhdimësinë e ngjarjes dhe jepi historisë fillim, konflikt, kulm dhe përfundim.",
      "Titulli: "+title,
      "Zhanri: "+genre,
      "Ideja: "+premise,
      "Personazhe të kërkuara (nëse ka): "+(characters||"Krijoji personazhet vetë sipas historisë.")
    ].join("\n\n");
    const response=await fetch("https://api.z.ai/api/paas/v4/chat/completions",{
      method:"POST",
      headers:{Authorization:"Bearer "+process.env.ZAI_API_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"glm-4.7-flash",
        messages:[
          {role:"system",content:"Je skenarist profesionist i filmave dhe serialeve. Shkruan skenarë origjinalë, emocionalë dhe kinematografikë në gjuhën shqipe."},
          {role:"user",content:prompt}
        ],
        thinking:{type:"disabled"},
        temperature:0.8,
        max_tokens:6000
      })
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      const message=data?.error?.message||data?.message||"ZAI nuk mundi të krijojë skenarin (HTTP "+response.status+").";
      return json(res,502,{error:String(message).slice(0,500)});
    }
    const script=data?.choices?.[0]?.message?.content;
    if(!script)return json(res,502,{error:"ZAI nuk ktheu skenar. Provo përsëri."});
    return json(res,200,{script,model:data.model||"glm-4.7-flash"});
  }catch(error){
    return json(res,500,{error:error?.message||"Gabim gjatë krijimit të skenarit."});
  }
}
