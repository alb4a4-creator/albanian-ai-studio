import React,{useState} from 'react';
import {supabase} from './lib/supabase';
import {Sparkles,Send,LoaderCircle,Bot} from 'lucide-react';
export default function OpenAIHub(){
 const [provider,setProvider]=useState('openai'),[prompt,setPrompt]=useState(''),[answer,setAnswer]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function ask(e){e.preventDefault();if(!prompt.trim()||busy)return;setBusy(true);setError('');setAnswer('');
 try{const session=await supabase?.auth.getSession();const token=session?.data?.session?.access_token;if(!token)throw new Error('Sesioni ka skaduar. Dil dhe hyr përsëri.');
 const response=await fetch('/api/ai-assistant',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({provider,prompt:prompt.trim()})});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Kërkesa nuk u krye.');setAnswer(data.answer||'Nuk u kthye përgjigje.');
 }catch(err){setError(err.message||'Ndodhi një gabim.')}finally{setBusy(false)}}
 return <section className="other voice-page"><label>ALBANIAN AI STUDIO · AI ASSISTANT</label><h1>Asistenti AI</h1><p>Përdor ChatGPT ose Google Gemini për ide, skenarë, tekste dhe ndihmë në krijim.</p>
 <div className="voice-generator-card" style={{maxWidth:850}}><div className="voice-free-head"><span className="voice-free-icon"><Bot size={24}/></span><div><b>Zgjidh modelin AI</b><small>Çelësat ruhen në serverin e Vercel</small></div><span className="voice-free-tag">BETA</span></div>
 <label style={{display:'block',margin:'20px 0 8px',fontWeight:600}}>Ofruesi</label><select value={provider} onChange={e=>setProvider(e.target.value)} style={{width:'100%',padding:12,borderRadius:10}}><option value="openai">OpenAI · ChatGPT</option><option value="gemini">Google · Gemini</option></select>
 <form onSubmit={ask}><label style={{display:'block',margin:'18px 0 8px',fontWeight:600}}>Çfarë dëshiron të krijosh?</label><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={5} maxLength={12000} placeholder="Shkruaj kërkesën tënde në shqip..." style={{width:'100%',padding:14,borderRadius:10}}/>
 <button className="generate" disabled={busy||!prompt.trim()} style={{marginTop:14}}>{busy?<LoaderCircle size={16}/>:<Sparkles size={16}/>} {busy?'Po mendoj…':'Dërgo kërkesën'} <Send size={15}/></button></form>
 {error&&<p className="hint" role="alert" style={{marginTop:14}}>{error}</p>}{answer&&<div style={{marginTop:20}}><label style={{fontWeight:700}}>Përgjigjja</label><div className="notice" style={{whiteSpace:'pre-wrap',marginTop:8}}>{answer}</div><button className="generate" onClick={()=>navigator.clipboard?.writeText(answer)} style={{marginTop:12}}>Kopjo përgjigjen</button></div>}
 <p className="hint" style={{marginTop:16}}>Përdorimi i API mund të ketë kosto sipas konsumit. Gemini kërkon API Key të vetin në Vercel.</p></div></section>;
}