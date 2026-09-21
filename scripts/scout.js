(()=>{
 const widget=document.querySelector('.scout-widget');if(!widget)return;
 const toggle=widget.querySelector('.scout-toggle'),pause=widget.querySelector('.scout-pause'),bubble=widget.querySelector('.scout-bubble'),close=widget.querySelector('.scout-close'),media=matchMedia('(prefers-reduced-motion: reduce)');
 let manual=false,blinkTimer,closing,excitedTimer;
 const stopped=()=>manual||media.matches||document.hidden;
 function scheduleBlink(){blinkTimer=setTimeout(()=>{if(stopped())return;widget.classList.add('is-blinking');closing=setTimeout(()=>{widget.classList.remove('is-blinking');if(!stopped())scheduleBlink()},145)},2800+Math.random()*3400)}
 function sync(){[blinkTimer,closing].forEach(clearTimeout);widget.classList.remove('is-blinking','is-excited');clearTimeout(excitedTimer);widget.classList.toggle('is-paused',stopped());pause.setAttribute('aria-pressed',String(manual||media.matches));pause.disabled=media.matches;pause.textContent=media.matches?'Still':manual?'Play':'Pause';pause.setAttribute('aria-label',media.matches?'Motion reduced by device settings':manual?'Play Scout animation':'Pause Scout animation');if(!stopped()){scheduleBlink()}}
 function show(open,restore=false){bubble.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close Scout introduction':'Open Scout introduction');if(restore)toggle.focus()}
 toggle.addEventListener('click',()=>{show(bubble.hidden);if(!stopped()){clearTimeout(excitedTimer);widget.classList.remove('is-excited');void widget.offsetWidth;widget.classList.add('is-excited');excitedTimer=setTimeout(()=>widget.classList.remove('is-excited'),2400)}});close.addEventListener('click',()=>show(false,true));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!bubble.hidden)show(false,true)});document.addEventListener('pointerdown',e=>{if(!widget.contains(e.target)&&!bubble.hidden)show(false)});
 pause.addEventListener('click',()=>{manual=!manual;sync()});media.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);sync();
})();
