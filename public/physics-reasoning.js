let authClient;
async function sessionToken() {
  const config=window.TOLUX_PUBLIC_CONFIG;
  if(!window.supabase || !config?.url || !config?.publishableKey) throw new Error('Sign-in is unavailable. Return to the dashboard and try again.');
  authClient ||= window.supabase.createClient(config.url,config.publishableKey);
  const {data,error}=await authClient.auth.getSession();
  if(error || !data?.session?.access_token) throw new Error('Sign in on the dashboard, then return here to check your explanation. Your writing remains in this box.');
  return data.session.access_token;
}
const labels={correct:'Your explanation is correct',partial:'You have part of the idea',misconception:'Reconsider this physical idea',unclear:'Clarify your explanation'};
export async function assessReflection({lessonId,questionId,response,output,button}) {
  if(!response.trim()){output.textContent='Write your explanation before checking.';return;}
  if(response.length>4000){output.textContent='Please keep your explanation within 4000 characters.';return;}
  button.disabled=true;output.textContent='Reading your explanation…';
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),60000);
  try {
    const token=await sessionToken();
    const res=await fetch('/api/coach',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({course:'Physics',mode:'Conceptual reasoning feedback',physicsReasoning:{lessonId,questionId,response}}),signal:controller.signal});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'Feedback is unavailable. Please try again.');
    const f=data.reasoningFeedback;
    if(!f || !labels[f.status] || ['what_is_right','what_to_reconsider','follow_up'].some(k=>typeof f[k]!=='string'))throw new Error('Feedback was incomplete. Please try again.');
    output.replaceChildren();
    const title=document.createElement('strong');title.textContent=labels[f.status];output.append(title);
    for(const [key,label] of [['what_is_right','What you explained well'],['what_to_reconsider','What to revisit'],['follow_up','Think about']]){
      if(!f[key])continue;const p=document.createElement('p');p.textContent=`${label}: ${f[key]}`;output.append(p);
    }
    const note=document.createElement('p');note.textContent='AI practice feedback. You can revise and check again; this does not award mastery credit.';output.append(note);
  } catch(error) {output.textContent=error.name==='AbortError'?'The tutor took too long. Your explanation is still here; please retry.':error.message;}
  finally{clearTimeout(timeout);button.disabled=false;}
}
