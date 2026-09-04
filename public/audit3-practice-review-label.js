(() => {
  const skill=new URLSearchParams(location.search).get('skill');
  if(!['A.3D','A.3E','A.3F','A.3G','A.3H','A.4A','A.4B','A.4C'].includes(skill))return;
  const feedback=document.querySelector('#practiceFeedback');
  const next=document.querySelector('#nextPracticeQuestion');
  if(!feedback||!next)return;
  const observer=new MutationObserver(()=>{
    const text=feedback.textContent||'';
    if(/Not correct|Check your work|correct answer and full/i.test(text)&&!next.hidden){
      next.textContent='Review Solution & Continue →';
    }
  });
  observer.observe(feedback,{childList:true,subtree:true});
})();