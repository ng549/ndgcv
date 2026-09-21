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

// Capabilities: a quiet invitation until mouse, keyboard, or touch selects a topic.
const capabilityButtons = [...document.querySelectorAll('#capabilities [data-capability]')];
const capabilityDetail = document.querySelector('#capabilities .cap-detail');
const capabilityInvitation = document.querySelector('#capabilities .cap-invitation');
let activeCapability = null, restoringCapabilityFocus = false, capabilityDismissTimer;
function scheduleCapabilityDismiss() {
  clearTimeout(capabilityDismissTimer);
  capabilityDismissTimer = setTimeout(() => closeCapability(false), 160);
}
function selectCapability(button) {
  clearTimeout(capabilityDismissTimer);
  activeCapability = button;
  capabilityButtons.forEach(item => {
    const selected = item === button;
    item.setAttribute('aria-expanded', String(selected));
    document.getElementById(item.dataset.capability).hidden = !selected;
  });
  capabilityDetail.hidden = false;
  capabilityInvitation.hidden = true;
  capabilityDetail.scrollTop = 0;
}
function closeCapability(restoreFocus = true) {
  clearTimeout(capabilityDismissTimer);
  capabilityButtons.forEach(item => {
    item.setAttribute('aria-expanded', 'false');
    document.getElementById(item.dataset.capability).hidden = true;
  });
  capabilityDetail.hidden = true;
  capabilityInvitation.hidden = false;
  if (activeCapability && restoreFocus) {
    restoringCapabilityFocus = true;
    activeCapability.focus({preventScroll:true});
    restoringCapabilityFocus = false;
  }
  activeCapability = null;
}
capabilityButtons.forEach(button => {
  button.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') selectCapability(button);
  });
  button.addEventListener('pointerleave', event => {if(event.pointerType === 'mouse') scheduleCapabilityDismiss();});
  button.addEventListener('blur', event => {if(!capabilityDetail.contains(event.relatedTarget)) scheduleCapabilityDismiss();});
  button.addEventListener('focus', () => {if (!restoringCapabilityFocus) selectCapability(button);});
  button.addEventListener('click', () => selectCapability(button));
});
capabilityDetail?.addEventListener('pointerenter',()=>clearTimeout(capabilityDismissTimer));
capabilityDetail?.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse')scheduleCapabilityDismiss();});
capabilityDetail?.addEventListener('focusin',()=>clearTimeout(capabilityDismissTimer));
capabilityDetail?.addEventListener('focusout',event=>{if(!capabilityDetail.contains(event.relatedTarget))scheduleCapabilityDismiss();});
document.querySelector('#capabilities .cap-close')?.addEventListener('click',()=>closeCapability());
document.addEventListener('keydown',event=>{if(event.key==='Escape' && activeCapability) closeCapability();});

const sections = {
  about: 'About me', opportunity: 'My next chapter', build: 'How I can help', capabilities: 'Capabilities', value: 'Results',
  'product-journey': 'From idea to sale', experience: 'My journey',
  ai: 'Systems & tools', 'software-work': 'Build process & AI toolkit', education: 'Education', contact: 'Let’s connect'
};
const sectionSummaries={about:'The person, interests and experiences behind the work.',opportunity:'The leadership role and businesses I want to help build.',experience:'Eight roles, with the context, work, outcomes and lessons.',build:'Business building, product economics and connected operations.',capabilities:'The capabilities I bring to the work.',value:'Commercial outcomes and the work behind them.','product-journey':'From the first opportunity to a product in customers’ hands.',ai:'Six approaches to connecting information, people and execution.','software-work':'From defining the problem through building, testing and release.',education:'University of Miami and the American University of Paris.',contact:'Six ways to get in touch or explore my experience.'};
Object.entries(sections).forEach(([id, title]) => {
  const section = document.getElementById(id);
  section.dataset.collapsible = '';
  const bar = document.createElement('div');
  bar.className = 'section-bar';
  const label = document.createElement('span');
  label.textContent = title;
  const preview=document.createElement('small');preview.className='section-preview';preview.textContent=sectionSummaries[id];label.append(preview);
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

// A single image moves between its job preview and original tab; it is never cloned.
document.querySelectorAll('.role.career-designed').forEach(role=>{
 const preview=role.querySelector('.role-preview-media');
 const image=role.querySelector('.career-chapter .chapter-media img');
 if(!preview||!image)return;
 const home=image.parentElement,marker=document.createComment('Career image home');home.insertBefore(marker,image);
 const place=()=>{if(role.open)marker.after(image);else preview.append(image)};
 role.addEventListener('toggle',place);place();
});
const orderedSections=[['profile','Profile'],['about','About me'],['opportunity','My next chapter'],['experience','My journey'],['build','How I can help'],['capabilities','Capabilities'],['value','Results'],['product-journey','From idea to sale'],['ai','Systems & tools'],['software-work','Build process & AI toolkit'],['education','Education'],['contact','Let’s connect']];
orderedSections.forEach(([id,title],i)=>{
 const section=document.getElementById(id);if(!section)return;
 const steps=document.createElement('nav');steps.className='section-stepper';steps.setAttribute('aria-label',title+' section navigation');
 for(const [index,direction,symbol] of [[i-1,'previous','←'],[i+1,'next','→']]){
  if(!orderedSections[index])continue;
  const [targetId,label]=orderedSections[index],link=document.createElement('a');link.href='#'+targetId;link.className='step-'+direction;
  link.setAttribute('aria-label',(direction==='next'?'Next: ':'Previous: ')+label);
  const arrow=document.createElement('span');arrow.className='step-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent=symbol;
  link.title=(direction==='next'?'Next: ':'Previous: ')+label;
  link.append(arrow);
  link.addEventListener('click',()=>{const target=document.getElementById(targetId);revealSection(target);requestAnimationFrame(()=>{target.scrollIntoView({block:'start',behavior:motion.matches?'instant':'smooth'});const heading=target.querySelector('.section-bar button,h1,h2');if(heading){heading.tabIndex=heading.tabIndex<0?-1:heading.tabIndex;heading.focus({preventScroll:true})}})});steps.append(link);
 }
 section.append(steps);
});
document.querySelectorAll('[data-current-year]').forEach(el=>el.textContent=new Date().getFullYear());
