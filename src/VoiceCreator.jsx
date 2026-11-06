import React,{useEffect,useRef,useState} from 'react';
import {Mic,MicOff,Sparkles,ArrowRight,Info,Trash2} from 'lucide-react';
export default function VoiceCreator({onUsePrompt}){
 const [listening,setListening]=useState(false);
 const [transcript,setTranscript]=useState('');
 const [interim,setInterim]=useState('');
 const [language,setLanguage]=useState('sq-AL');
 const [error,setError]=useState('');
 const recognition=useRef(null);
 useEffect(()=>{
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Speech)return;
  const r=new Speech();r.lang=language;r.continuous=true;r.interimResults=true;
  r.onresult=e=>{let finalText='',partial='';for(let i=e.resultIndex;i<e.results.length;i++){const part=e.results[i][0]?.transcript||'';if(e.results[i].isFinal)finalText+=part+' ';else partial+=part;}if(finalText)setTranscript(v=>(v+' '+finalText).trim());setInterim(partial);};
  r.onerror=e=>{setError(e.error==='not-allowed'?'Lejo mikrofonin në shfletues dhe provo përsëri.':'Nuk u njoh zëri. Provo edhe një herë.');setListening(false);};
  r.onend=()=>{setListening(false);setInterim('');};recognition.current=r;
  return()=>{try{r.stop();}catch{}};
 },[language]);
 function start(){setError('');if(!recognition.current){setError('Ky shfletues nuk e mbështet njohjen e zërit. Shkruaje kërkesën në fushë.');return;}setTranscript('');setInterim('');try{recognition.current.start();setListening(true);}catch{setError('Mikrofoni nuk u aktivizua. Rifresko faqen dhe provo përsëri.');}}
 function stop(){try{recognition.current?.stop();}catch{}setListening(false);}
 const full=(transcript+' '+interim).trim();
 return <section className="other voice-creator-page">
  <label>ALBANIAN AI STUDIO · AI CREATOR</label><h1>Krijo duke folur</h1>
  <p>Trego me zë çfarë videoje dëshiron. Kontrolloje kërkesën dhe pastaj kalo te gjenerimi.</p>
  <div className="voice-generator-card">
   <div className="voice-free-head"><span className="voice-free-icon"><Sparkles size={24}/></span><div><b>Asistenti yt krijues</b><small>Shqip · Deutsch · English</small></div><span className="voice-free-tag">AI CREATOR</span></div>
   <div className="voice-creator-controls"><label htmlFor="voice-lang">GJUHA E TË FOLURIT</label><select id="voice-lang" value={language} disabled={listening} onChange={e=>setLanguage(e.target.value)}><option value="sq-AL">Shqip</option><option value="de-DE">Deutsch</option><option value="en-US">English</option></select></div>
   <div className="voice-talk-area"><button type="button" className={'voice-talk-button '+(listening?'is-listening':'')} onClick={listening?stop:start}>{listening?<MicOff size={30}/>:<Mic size={30}/>}<b>{listening?'Ndalo dëgjimin':'Prek dhe fol'}</b><small>{listening?'Po dëgjoj…':'Përshkruaj reklamën ose videon'}</small></button></div>
   <label>TEKSTI I NJOHUR</label><textarea className="voice-creator-text" value={full} onChange={e=>{setTranscript(e.target.value);setInterim('');}} placeholder="P.sh. Krijo një reklamë për një makinë sportive, me pamje kinematografike dhe muzikë emocionuese…"/>
   <div className="voice-creator-actions"><button type="button" className="copy" onClick={()=>{setTranscript('');setInterim('');setError('');}}><Trash2 size={14}/> Pastro</button><button type="button" className="generate" disabled={!full||listening} onClick={()=>onUsePrompt(full)}><ArrowRight size={16}/> Konfirmo dhe vazhdo në Studio</button></div>
   {error&&<div className="notice">{error}</div>}
   <div className="previewnote"><Info size={16}/><span>Ky version përdor njohjen e të folurit të shfletuesit për të plotësuar udhëzimin. Ende nuk është bisedë e lirë me model AI. Videoja dhe kreditet nuk nisen derisa të konfirmosh krijimin në Studio.</span></div>
  </div>
 </section>;
}