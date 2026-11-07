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

async function askClaude(prompt){
  const response=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{
      "content-type":"application/json",
      "x-api-key":process.env.ANTHROPIC_API_KEY,
      "anthropic-version":"2026-10-21"
    },
    body:JSON.stringify({
      model:process.env.CLAUDE_MODEL||"claude-sonnet-5-5",
      max_tokens:3000,
      messages:[{role:"user",content:prompt}]
    })
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.error?.message||"Claude API gabim (HTTP "+response.status+").");
  const answer=(data.content||[]).filter(x=>x.type==="text").map(x=>x.text).join("\n").trim();
  if(!answer)throw new Error("Claude nuk ktheu përgjigje tekstuale.");
  return answer;
}

async function askGPT(prompt){
  const response=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{
      "content-type":"application/json",
      "authorization":"Bearer "+process.env.OPENAI_API_KEY
    },
    body:JSON.stringify({
      model:process.env.OPENAI_MODEL||"gpt-6.1-sol",
      instructions:"Je ChatGPT, bashkëpunon me Claude për t'i dhënë përdoruesit përgjigje të qartë, të saktë dhe praktike. Shkruaj në shqip nëse përdoruesi nuk kërkon gjuhë tjetër.",
      input:prompt,
      max_output_tokens:3000
    })
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.error?.message||"OpenAI API gabim (HTTP "+response.status+").");
  const answer=(data.output||[]).flatMap(item=>item.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n").trim();
  if(!answer)throw new Error("ChatGPT nuk ktheu përgjigje tekstuale.");
  return answer;
}

export default async function handler(req,res){
  if(req.method!=="POST")return json(res,405,{error:"Method not allowed."});
  try{
    if(!await verifyUser(req))return json(res,401,{error:"Sesioni ka skaduar. Hyr përsëri në Albanian AI Studio."});
    const body=req.body||{};
    const prompt=String(body.prompt||"").trim().slice(0,10000);
    const mode=["claude_then_gpt","gpt_then_claude","parallel"].includes(body.mode)?body.mode:"claude_then_gpt";
    if(prompt.length<3)return json(res,400,{error:"Shkruaj pyetjen ose detyrën tënde."});
    if(!process.env.ANTHROPIC_API_KEY||!process.env.OPENAI_API_KEY){
      return json(res,503,{error:"Për ta aktivizuar AI Bridge duhen të dy çelësat në Vercel: ANTHROPIC_API_KEY dhe OPENAI_API_KEY. Çelësat mbahen vetëm në server."});
    }

    let claude="",gpt="";
    if(mode==="parallel"){
      [claude,gpt]=await Promise.all([askClaude(prompt),askGPT(prompt)]);
    }else if(mode==="claude_then_gpt"){
      claude=await askClaude(prompt);
      gpt=await askGPT("Kërkesa e përdoruesit:\n"+prompt+"\n\nPërgjigjja paraprake e Claude:\n"+claude+"\n\nTani shqyrto përgjigjen e Claude, korrigjo çdo pasaktësi dhe jep përgjigjen përfundimtare. Trego shkurt ku pajtohesh ose ku e përmirëson.");
    }else{
      gpt=await askGPT(prompt);
      claude=await askClaude("Kërkesa e përdoruesit:\n"+prompt+"\n\nPërgjigjja paraprake e ChatGPT:\n"+gpt+"\n\nShqyrto përgjigjen, gjej gabime ose mangësi dhe jep përgjigjen tënde përfundimtare. Trego shkurt ku pajtohesh ose ku e përmirëson.");
    }
    return json(res,200,{
      mode,
      claude:{model:process.env.CLAUDE_MODEL||"claude-sonnet-5-5",answer:claude},
      chatgpt:{model:process.env.OPENAI_MODEL||"gpt-6.1-sol",answer:gpt},
      final:mode==="gpt_then_claude"?claude:mode==="claude_then_gpt"?gpt:""
    });
  }catch(error){
    return json(res,502,{error:String(error?.message||"Gabim gjatë komunikimit me modelet AI.").slice(0,600)});
  }
}
