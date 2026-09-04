(() => {
  const skill=new URLSearchParams(location.search).get('skill');
  const allowed=new Set(['A.2C','A.2D','A.2E','A.2F','A.2G','A.2H','A.2I','A.3A','A.3B','A.3C']);
  if(!allowed.has(skill))return;
  const feedback=document.querySelector('#practiceFeedback');
  const next=document.querySelector('#nextPracticeQuestion');
  if(!feedback||!next)return;
  function sync(){
    const text=feedback.textContent||'';
    if(/Not correct|Check your work|Compare your attempt/i.test(text)&&!next.hidden){
      next.textContent='Review Solution & Continue →';
    }
  }
  const observer=new MutationObserver(sync);
  observer.observe(feedback,{childList:true,subtree:true});
  sync();
})();