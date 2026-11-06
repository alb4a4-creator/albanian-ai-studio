import React,{useEffect,useRef,useState} from 'react';
import {Mic,MicOff,Sparkles,ArrowRight,Info,Trash2} from 'lucide-react';
export default function VoiceCreator({onUsePrompt,lang='sq'}){
 const words={sq:{title:'Krijo duke folur',intro:'Trego me zë çfarë videoje dëshiron. Kontrolloje kërkesën dhe pastaj kalo te gjenerimi.',assistant:'Asistenti yt krijues',spoken:'GJUHA E TË FOLURIT',recognized:'TEKSTI I NJOHUR',stop:'Ndalo dëgjimin',start:'Prek dhe fol',listening:'Po dëgjoj…',describe:'Përshkruaj reklamën ose videon',clear:'Pastro',continue:'Konfirmo dhe vazhdo në Studio',noMic:'Lejo mikrofonin në shfletues dhe provo përsëri.',notRecognized:'Nuk u njoh zëri. Provo edhe një herë.',unsupported:t.unsupported,micError:t.micError,placeholder:'P.sh. Krijo një reklamë për një makinë sportive, me pamje kinematografike dhe muzikë emocionuese…',note:'Ky version përdor njohjen e të folurit të shfletuesit për të plotësuar udhëzimin. Ende nuk është bisedë e lirë me model AI. Videoja dhe kreditet nuk nisen derisa të konfirmosh krijimin në Studio.'},de:{title:'Mit Sprache erstellen',intro:'Beschreibe per Sprache, welches Video du möchtest. Prüfe deine Eingabe und fahre dann mit der Erstellung fort.',assistant:'Dein kreativer Assistent',spoken:'SPRACHEINGABE',recognized:'ERKANNTER TEXT',stop:'Aufnahme stoppen',start:'Tippen und sprechen',listening:'Ich höre zu…',describe:'Beschreibe die Werbung oder das Video',clear:'Leeren',continue:'Bestätigen und in Studio fortfahren',noMic:'Erlaube den Mikrofonzugriff im Browser und versuche es erneut.',notRecognized:'Sprache wurde nicht erkannt. Bitte versuche es erneut.',unsupported:'Dieser Browser unterstützt keine Spracherkennung. Schreibe deine Eingabe in das Textfeld.',micError:'Das Mikrofon wurde nicht aktiviert. Lade die Seite neu und versuche es erneut.',placeholder:'Zum Beispiel: Erstelle einen Werbespot für einen Sportwagen mit filmischen Bildern und mitreißender Musik…',note:'Diese Version verwendet die Spracherkennung des Browsers, um den Prompt auszufüllen. Es ist noch kein freies Gespräch mit einem KI-Modell. Video und Credits starten erst, wenn du die Erstellung in Studio bestätigst.'},en:{title:'Create with your voice',intro:'Describe the video you want by speaking. Review your prompt, then continue to generation.',assistant:'Your creative assistant',spoken:'SPOKEN LANGUAGE',recognized:'RECOGNIZED TEXT',stop:'Stop listening',start:'Tap and speak',listening:'Listening…',describe:'Describe the ad or video',clear:'Clear',continue:'Confirm and continue to Studio',noMic:'Allow microphone access in your browser and try again.',notRecognized:'Speech was not recognized. Please try again.',unsupported:'This browser does not support speech recognition. Type your prompt in the field.',micError:'The microphone could not be activated. Refresh the page and try again.',placeholder:'For example: Create an ad for a sports car with cinematic visuals and exciting music…',note:'This version uses your browser’s speech recognition to fill in the prompt. It is not yet a free-form conversation with an AI model. Video generation and credits will not start until you confirm creation in Studio.'}};
 const t=words[lang]||words.sq;
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
  r.onerror=e=>{setError(e.error==='not-allowed'?t.noMic:t.notRecognized);setListening(false);};
  r.onend=()=>{setListening(false);setInterim('');};recognition.current=r;
  return()=>{try{r.stop();}catch{}};
 },[language]);
 function start(){setError('');if(!recognition.current){setError('Ky shfletues nuk e mbështet njohjen e zërit. Shkruaje kërkesën në fushë.');return;}setTranscript('');setInterim('');try{recognition.current.start();setListening(true);}catch{setError('Mikrofoni nuk u aktivizua. Rifresko faqen dhe provo përsëri.');}}
 function stop(){try{recognition.current?.stop();}catch{}setListening(false);}
 const full=(transcript+' '+interim).trim();
 return <section className="other voice-creator-page">
  <label>ALBANIAN AI STUDIO · AI CREATOR</label><h1>{t.title}</h1>
  <p>{t.intro}</p>
  <div className="voice-generator-card">
   <div className="voice-free-head"><span className="voice-free-icon"><Sparkles size={24}/></span><div><b>{t.assistant}</b><small>Shqip · Deutsch · English</small></div><span className="voice-free-tag">AI CREATOR</span></div>
   <div className="voice-creator-controls"><label htmlFor="voice-lang">{t.spoken}</label><select id="voice-lang" value={language} disabled={listening} onChange={e=>setLanguage(e.target.value)}><option value="sq-AL">Shqip</option><option value="de-DE">Deutsch</option><option value="en-US">English</option></select></div>
   <div className="voice-talk-area"><button type="button" className={'voice-talk-button '+(listening?'is-listening':'')} onClick={listening?stop:start}>{listening?<MicOff size={30}/>:<Mic size={30}/>}<b>{listening?t.stop:t.start}</b><small>{listening?t.listening:t.describe}</small></button></div>
   <label>{t.recognized}</label><textarea className="voice-creator-text" value={full} onChange={e=>{setTranscript(e.target.value);setInterim('');}} placeholder={t.placeholder}/>
   <div className="voice-creator-actions"><button type="button" className="copy" onClick={()=>{setTranscript('');setInterim('');setError('');}}><Trash2 size={14}/> {t.clear}</button><button type="button" className="generate" disabled={!full||listening} onClick={()=>onUsePrompt(full)}><ArrowRight size={16}/> {t.continue}</button></div>
   {error&&<div className="notice">{error}</div>}
   <div className="previewnote"><Info size={16}/><span>{t.note}</span></div>
  </div>
 </section>;
}