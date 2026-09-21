(()=>{
 const widget=document.querySelector('.scout-widget');if(!widget)return;
 const button=widget.querySelector('button'),eyes=widget.querySelector('.scout-blink'),icon=widget.querySelector('.scout-motion'),media=matchMedia('(prefers-reduced-motion: reduce)');
 let manual=false,timer,closing;
 function stopped(){return manual||media.matches||document.hidden}
 function schedule(){timer=setTimeout(()=>{if(stopped())return;eyes.classList.add('is-blinking');closing=setTimeout(()=>{eyes.classList.remove('is-blinking');if(!stopped())schedule()},145)},2600+Math.random()*3700)}
 function sync(){clearTimeout(timer);clearTimeout(closing);eyes.classList.remove('is-blinking');const paused=stopped();widget.classList.toggle('is-paused',paused);button.setAttribute('aria-pressed',String(manual||media.matches));const label=media.matches?'Scout — motion reduced by your device settings':manual?'Play Scout animation':'Pause Scout animation';button.setAttribute('aria-label',label);button.title=label;icon.textContent=paused?'▶':'Ⅱ';if(!paused)schedule()}
 button.addEventListener('click',()=>{if(media.matches)return;manual=!manual;sync()});media.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);sync();
})();
