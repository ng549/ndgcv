const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#navigation');
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open)});
function openHash(){const id=decodeURIComponent(location.hash.slice(1));if(!id)return;const el=document.getElementById(id);if(!el)return;for(let p=el;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;requestAnimationFrame(()=>el.scrollIntoView({block:'start'}))}
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');const target=document.getElementById(a.hash.slice(1));if(target?.tagName==='DETAILS')target.open=true}));
addEventListener('hashchange',openHash);if(location.hash)openHash();
document.addEventListener('keydown',e=>{if(e.key==='Escape'){nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false')}});
document.querySelectorAll('[data-gallery]').forEach(g=>g.querySelectorAll('[data-shot]').forEach(b=>b.addEventListener('click',()=>{const img=g.querySelector('img');img.src=b.dataset.shot;img.alt=b.dataset.alt;g.querySelector('a').href=b.dataset.shot;g.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))})));
const motion=matchMedia('(prefers-reduced-motion: reduce)'),small=matchMedia('(max-width: 760px)');let pending=false;
function paint(){pending=false;document.querySelectorAll('[data-parallax]').forEach(el=>{if(motion.matches||small.matches){el.style.transform='';return}const rect=el.closest('section').getBoundingClientRect();if(rect.bottom>0&&rect.top<innerHeight){const y=el.closest('section').id==='profile'?-rect.top:innerHeight/2-(rect.top+rect.height/2);el.style.transform=`translate3d(0,${Math.max(-160,Math.min(160,y*Number(el.dataset.parallax)))}px,0)`}})}
addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(paint)}},{passive:true});motion.addEventListener('change',paint);small.addEventListener('change',paint);
const form=document.querySelector('#reference-form');form?.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const d=new FormData(form);const body=`Hello Nicolas,\n\nI'd like to request references.\n\nName: ${d.get('name')}\nCompany / role: ${d.get('company')}\nEmail: ${d.get('email')}\n\nOpportunity and what I'd like to discuss:\n${d.get('story')}\n`;location.href='mailto:ngoureau@mac.com?subject='+encodeURIComponent('Reference request — '+d.get('name'))+'&body='+encodeURIComponent(body);document.querySelector('#reference-status').textContent='Your email app will open with the request. Send it there to reach Nicolas.'});

// Capability descriptions work with a mouse, keyboard, or touch.
const capabilityButtons = [...document.querySelectorAll('[data-capability]')];
function selectCapability(button) {
  capabilityButtons.forEach(item => {
    const selected = item === button;
    item.setAttribute('aria-expanded', String(selected));
    document.getElementById(item.dataset.capability).hidden = !selected;
  });
}
capabilityButtons.forEach(button => {
  button.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') selectCapability(button);
  });
  button.addEventListener('focus', () => selectCapability(button));
  button.addEventListener('click', () => selectCapability(button));
});
if (capabilityButtons.length) selectCapability(capabilityButtons[0]);

const sections = {
  about: 'About me', opportunity: 'My next chapter', build: 'The work', value: 'Results',
  'product-journey': 'From idea to sale', experience: 'My journey',
  ai: 'Systems, tools & AI', contact: 'Let’s talk'
};
Object.entries(sections).forEach(([id, title]) => {
  const section = document.getElementById(id);
  section.dataset.collapsible = '';
  const bar = document.createElement('div');
  bar.className = 'section-bar';
  const label = document.createElement('span');
  label.textContent = title;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'section-toggle';
  button.textContent = 'Minimize −';
  button.setAttribute('aria-expanded', 'true');
  button.setAttribute('aria-label', `Minimize ${title}`);
  button.addEventListener('click', () => {
    const closed = section.classList.toggle('is-minimized');
    button.textContent = closed ? 'Expand +' : 'Minimize −';
    button.setAttribute('aria-expanded', String(!closed));
    button.setAttribute('aria-label', `${closed ? 'Expand' : 'Minimize'} ${title}`);
  });
  bar.append(label, button);
  section.prepend(bar);
});
function revealSection(target) {
  for (let parent = target; parent; parent = parent.parentElement) {
    if (parent.tagName === 'DETAILS') parent.open = true;
    if (parent.matches('[data-collapsible]')) {
      parent.classList.remove('is-minimized');
      const button = parent.querySelector(':scope > .section-bar button');
      button.textContent = 'Minimize −';
      button.setAttribute('aria-expanded', 'true');
      button.setAttribute('aria-label', `Minimize ${sections[parent.id]}`);
    }
  }
}
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', () => {
    const target = document.getElementById(link.hash.slice(1));
    if (target) {
      revealSection(target);
      requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    }
  });
});
addEventListener('hashchange', () => {
  const target = document.getElementById(location.hash.slice(1));
  if (target) revealSection(target);
});
const initialTarget = document.getElementById(location.hash.slice(1));
if (initialTarget) revealSection(initialTarget);
const navObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    nav.querySelectorAll('a').forEach(a => {
      if (a.hash === '#' + entry.target.id) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  });
}, { rootMargin: '-10% 0px -65% 0px' });
document.querySelectorAll('section[id]').forEach(section => navObserver.observe(section));

paint();

// Process details remain readable while a visitor moves from the diagram into the explanation.
const journeyButtons=[...document.querySelectorAll('[data-journey]')];
function selectJourney(button){journeyButtons.forEach(item=>{const active=item===button;item.setAttribute('aria-expanded',String(active));document.getElementById(item.dataset.journey).hidden=!active})}
journeyButtons.forEach(button=>{button.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')selectJourney(button)});button.addEventListener('focus',()=>selectJourney(button));button.addEventListener('click',()=>selectJourney(button))});
const companyAbout=[...document.querySelectorAll('.company-about')];
function setAbout(wrap,open){wrap.querySelector('button').setAttribute('aria-expanded',String(open));wrap.querySelector('.company-card').hidden=!open}
companyAbout.forEach(wrap=>{const button=wrap.querySelector('button');wrap.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')setAbout(wrap,true)});wrap.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'&&!wrap.contains(document.activeElement))setAbout(wrap,false)});button.addEventListener('focus',()=>setAbout(wrap,true));wrap.addEventListener('focusout',event=>{if(!wrap.contains(event.relatedTarget))setAbout(wrap,false)});button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();setAbout(wrap,true)});wrap.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();setAbout(wrap,false)}})});
document.addEventListener('click',event=>companyAbout.forEach(wrap=>{if(!wrap.contains(event.target))setAbout(wrap,false)}));

// Tool explanations use the same hover, focus and tap contract as company About.
const toolItems=[...document.querySelectorAll('.tool-item')];
function closeTools(except){toolItems.forEach(item=>{if(item===except)return;item.querySelector('button').setAttribute('aria-expanded','false');item.querySelector('.tool-tooltip').hidden=true})}
toolItems.forEach(item=>{const button=item.querySelector('button'),tip=item.querySelector('.tool-tooltip');const show=()=>{closeTools(item);button.setAttribute('aria-expanded','true');tip.hidden=false};item.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')show()});item.addEventListener('pointerleave',()=>closeTools());button.addEventListener('focus',show);button.addEventListener('click',()=>{show()});item.addEventListener('focusout',e=>{if(!item.contains(e.relatedTarget))closeTools()})});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeTools()});
document.addEventListener('click',e=>{if(!e.target.closest('.tool-item'))closeTools()});

// Each career section keeps its own image and copy, matching the original story tabs.
document.querySelectorAll('.career-tabs').forEach(list=>{
 const tabs=[...list.querySelectorAll('[role="tab"]')];
 const select=tab=>{tabs.forEach(t=>{const selected=t===tab;t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1;document.getElementById(t.getAttribute('aria-controls')).hidden=!selected})};
 tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>select(tab));tab.addEventListener('keydown',event=>{let index;if(event.key==='ArrowRight')index=(i+1)%tabs.length;if(event.key==='ArrowLeft')index=(i+tabs.length-1)%tabs.length;if(event.key==='Home')index=0;if(event.key==='End')index=tabs.length-1;if(index!==undefined){event.preventDefault();select(tabs[index]);tabs[index].focus()}})});
});
