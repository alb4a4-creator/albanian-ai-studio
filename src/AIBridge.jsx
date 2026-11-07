import React,{useState} from "react";
import {ArrowDownUp,BrainCircuit,CheckCircle2,LoaderCircle,MessageSquareText,Sparkles} from "lucide-react";
import {supabase} from "./lib/supabase";

export default function AIBridge(){
  const [prompt,setPrompt]=useState("");
  const [mode,setMode]=useState("claude_then_gpt");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [result,setResult]=useState(null);

  async function runBridge(){
    if(!prompt.trim()||busy)return;
    setBusy(true);setError("");setResult(null);
    try{
      const sessionResult=await supabase?.auth.getSession();
      const token=sessionResult?.data?.session?.access_token;
      if(!token)throw new Error("Hyr në llogarinë tënde për të përdorur AI Bridge.");
      const response=await fetch("/api/ai-bridge",{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
        body:JSON.stringify({prompt:prompt.trim(),mode})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"Nuk u krye kërkesa. Provo përsëri.");
      setResult(data);
    }catch(e){setError(e.message||"Ndodhi një gabim.");}
    finally{setBusy(false);}
  }

  return <section className="other voice-page ai-bridge-page">
    <label>ALBANIAN AI STUDIO · MULTI-AGENT</label>
    <h1>AI Bridge</h1>
    <p>Lidh Claude dhe ChatGPT në një bisedë pune. Njëri përgjigjet dhe tjetri e shqyrton përgjigjen.</p>
    <div className="voice-generator-card" style={{maxWidth:900}}>
      <div className="voice-free-head">
        <span className="voice-free-icon"><ArrowDownUp size={24}/></span>
        <div><b>Claude + ChatGPT</b><small>Bashkëpunim mes dy modeleve AI</small></div>
        <span className="voice-free-tag">AI BRIDGE</span>
      </div>
      <label style={{display:"block",margin:"22px 0 8px",fontWeight:650}}>Si dëshiron të bashkëpunojnë?</label>
      <select value={mode} onChange={e=>setMode(e.target.value)} style={{width:"100%",padding:13,borderRadius:10}}>
        <option value="claude_then_gpt">Claude përgjigjet → ChatGPT shqyrton dhe përfundon</option>
        <option value="gpt_then_claude">ChatGPT përgjigjet → Claude shqyrton dhe përfundon</option>
        <option value="parallel">Të dy përgjigjen veçmas në të njëjtën kohë</option>
      </select>
      <label style={{display:"block",margin:"20px 0 8px",fontWeight:650}}>Shkruaj pyetjen ose detyrën</label>
      <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={5} maxLength={10000} placeholder="P.sh. Analizoni këtë ide për Albanian AI Studio dhe propozoni mënyrën më të mirë për ta realizuar…" style={{width:"100%",padding:14,borderRadius:10,resize:"vertical"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginTop:12}}>
        <small style={{opacity:.7}}>{prompt.length}/10000</small>
        <button className="generate" type="button" onClick={runBridge} disabled={!prompt.trim()||busy} style={{opacity:!prompt.trim()||busy ? 0.6 : 1}}>
          {busy?<LoaderCircle size={17} className="spin"/>:<Sparkles size={17}/>}
          {busy?"Po komunikojnë…":"Nis bashkëpunimin"}
        </button>
      </div>
      {error&&<div className="notice" role="alert" style={{marginTop:16}}>{error}</div>}
      {result&&<div style={{display:"grid",gap:14,marginTop:24}}>
        <div style={{border:"1px solid var(--line,#333)",borderRadius:14,padding:16}}>
          <div className="voice-free-head"><BrainCircuit size={21}/><div><b>Claude</b><small>{result.claude?.model}</small></div><CheckCircle2 size={18}/></div>
          <div style={{whiteSpace:"pre-wrap",lineHeight:1.65,marginTop:14}}>{result.claude?.answer}</div>
        </div>
        <div style={{border:"1px solid var(--line,#333)",borderRadius:14,padding:16}}>
          <div className="voice-free-head"><MessageSquareText size={21}/><div><b>ChatGPT</b><small>{result.chatgpt?.model}</small></div><CheckCircle2 size={18}/></div>
          <div style={{whiteSpace:"pre-wrap",lineHeight:1.65,marginTop:14}}>{result.chatgpt?.answer}</div>
        </div>
        {result.final&&<div style={{border:"1px solid var(--accent,#8b5cf6)",borderRadius:14,padding:16}}>
          <b>Përgjigjja përfundimtare</b>
          <div style={{whiteSpace:"pre-wrap",lineHeight:1.7,marginTop:12}}>{result.final}</div>
        </div>}
      </div>}
      <p className="hint" style={{marginTop:18}}>Përdorimi i API-ve mund të ketë kosto të veçantë nga abonimet ChatGPT dhe Claude. Çelësat privatë nuk shfaqen në shfletues.</p>
    </div>
  </section>;
}
