const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#navigation');
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open)});
function openHash(){const id=decodeURIComponent(location.hash.slice(1));if(!id)return;const el=document.getElementById(id);if(!el)return;for(let p=el;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;requestAnimationFrame(()=>el.scrollIntoView({block:'start'}))}
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');const target=document.getElementById(a.hash.slice(1));if(target?.tagName==='DETAILS')target.open=true}));
addEventListener('hashchange',openHash);
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

const sections = {"about": "About me", "experience": "How I got here", "career-master": "My experience", "ai": "How I work", "software-work": "Building with AI", "product-journey": "From idea to sale", "capabilities": "What I bring", "value": "The results", "build": "Where I can help", "opportunity": "What comes next", "education": "Education"};
const sectionSummaries={"about": "The person behind the work.", "experience": "From the shop floor to building businesses and connecting operations.", "career-master": "My roles, with context, work, outcomes, and lessons.", "ai": "Connecting people, information, and systems to make things work better.", "software-work": "Applying operating experience to practical software, programs, and apps.", "product-journey": "Bringing the product, economics, and operation together.", "capabilities": "Creative thinking, commercial judgment, and hands-on execution.", "value": "What changed through the work.", "build": "Turning opportunities into businesses that can operate and grow.", "opportunity": "The next chapter I want to build—and who I want to build it with.", "education": "My academic foundation and experiences beyond the classroom.", "contact": "A conversation about what we could build together."};
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
  button.textContent = '−';
  button.setAttribute('aria-expanded', 'true');
  button.setAttribute('aria-label', `Minimize ${title}`);
  button.addEventListener('click', () => {
    const closed = section.classList.toggle('is-minimized');
    button.textContent = closed ? '' : '−';
    button.setAttribute('aria-expanded', String(!closed));
    button.setAttribute('aria-label', `${closed ? 'Expand' : 'Minimize'} ${title}`);
  });
  bar.append(label, button);
  section.prepend(bar);
  section.addEventListener('click',event=>{if(section.classList.contains('is-minimized')&&!button.contains(event.target))button.click()});
  if(section.matches('[data-collapsible]')){
    section.classList.add('is-minimized');button.textContent='';button.setAttribute('aria-expanded','false');button.setAttribute('aria-label',`Expand ${title}`);
  }
});
// One global control: expand any closed sections, otherwise minimize all.
const allControls=document.createElement('div');allControls.className='section-all-controls';
const allControl=document.createElement('button');allControl.type='button';
allControls.append(allControl);nav.append(allControls);
const collapsibleSections=[...document.querySelectorAll('main>section[data-collapsible]')];
function syncAllControl(){
 const expand=collapsibleSections.some(section=>section.classList.contains('is-minimized'));
 const label=expand?'Expand all sections':'Minimize all sections';
 allControl.title=label;allControl.setAttribute('aria-label',label);
 allControl.innerHTML=`<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="${expand?'M5 8l7-5 7 5M5 16l7 5 7-5':'M5 3l7 5 7-5M5 21l7-5 7 5'}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
allControl.addEventListener('click',()=>{
 const expand=collapsibleSections.some(section=>section.classList.contains('is-minimized'));
 collapsibleSections.forEach(section=>{if(section.classList.contains('is-minimized')===expand)section.querySelector(':scope>.section-bar button').click()});
 syncAllControl();
});
// One decorative roadmap joins the section headings, including expanded sections.
const roadmapMain=document.querySelector('main');
const roadmap=document.createElementNS('http://www.w3.org/2000/svg','svg');
roadmap.classList.add('section-roadmap');roadmap.setAttribute('aria-hidden','true');
const roadmapPath=document.createElementNS(roadmap.namespaceURI,'path');roadmap.append(roadmapPath);
const roadmapDots=collapsibleSections.map(section=>{
 const dot=document.createElementNS(roadmap.namespaceURI,'circle');dot.dataset.section=section.id;dot.setAttribute('r','3.5');roadmap.append(dot);return dot;
});
roadmapMain.append(roadmap);
function syncRoadmap(){
 const mainRect=roadmapMain.getBoundingClientRect();
 roadmap.setAttribute('width',String(mainRect.width));roadmap.setAttribute('height',String(mainRect.height));
 const points=collapsibleSections.map(section=>{
  const bar=section.querySelector(':scope>.section-bar');const label=bar.querySelector('span');
  const rect=label.getBoundingClientRect();const style=getComputedStyle(label);
  return {x:Math.max(10,rect.left-mainRect.left-22),y:rect.top-mainRect.top+parseFloat(style.paddingTop)+(parseFloat(style.lineHeight)||parseFloat(style.fontSize)*1.3)/2,top:section.getBoundingClientRect().top-mainRect.top};
 });
 let path='';points.forEach((point,index)=>{
  path+=index?` V ${point.top} H ${point.x} V ${point.y}`:`M ${point.x} ${point.y}`;
  roadmapDots[index].setAttribute('cx',String(point.x));roadmapDots[index].setAttribute('cy',String(point.y));
 });roadmapPath.setAttribute('d',path);
}
function syncBandArtwork(){
 const heights=collapsibleSections.map(section=>section.querySelector(':scope>.section-bar').offsetHeight);
 const total=heights.reduce((sum,height)=>sum+height,0);let offset=0;
 collapsibleSections.forEach((section,index)=>{section.style.setProperty('--band-art-height',`${total}px`);section.style.setProperty('--band-art-offset',`${-offset}px`);offset+=heights[index]});
 syncRoadmap();
}
const sectionStateObserver=new MutationObserver(()=>{syncAllControl();syncBandArtwork()});
collapsibleSections.forEach(section=>sectionStateObserver.observe(section,{attributes:true,attributeFilter:['class']}));
new ResizeObserver(syncBandArtwork).observe(document.querySelector('main'));
addEventListener('resize',syncBandArtwork);syncAllControl();syncBandArtwork();
function revealSection(target) {
  if(target?.classList.contains('overview-section'))target.querySelector(':scope>details').open=true;
  for (let parent = target; parent; parent = parent.parentElement) {
    if (parent.tagName === 'DETAILS') parent.open = true;
    if (parent.matches('[data-collapsible]')) {
      parent.classList.remove('is-minimized');
      const button = parent.querySelector(':scope > .section-bar button');
      button.textContent = '−';
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
// Every section starts collapsed, including when refreshing a section URL.
function syncNavigation(){
 const destinations=[...document.querySelectorAll('main>section[id]')];
 const marker=innerHeight*.2;
 const current=destinations.find(section=>{const rect=section.getBoundingClientRect();return rect.top<=marker&&rect.bottom>marker})||destinations.find(section=>section.getBoundingClientRect().top>marker);
 roadmapDots.forEach(dot=>{const active=dot.dataset.section===current?.id;dot.classList.toggle('is-current',active);dot.setAttribute('r',active?'6':'3.5')});
 nav.querySelectorAll('a').forEach(a=>{if(current&&a.hash==='#'+current.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});
}
const navObserver=new IntersectionObserver(syncNavigation,{rootMargin:'-10% 0px -65% 0px'});
document.querySelectorAll('main>section[id]').forEach(section=>navObserver.observe(section));
addEventListener('scroll',syncNavigation,{passive:true});syncNavigation();

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

// Career previews use background scenes; original foreground artwork stays in its tab.
document.querySelectorAll('.career-open-button').forEach(button=>{
 const role=button.closest('details');
 button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();role.open=true});
 role.addEventListener('toggle',()=>button.setAttribute('aria-expanded',String(role.open)));
});
const orderedSections=[["profile", "Profile"], ["about", "About me"], ["experience", "How I got here"], ["career-master", "My experience"], ["ai", "How I work"], ["software-work", "Building with AI"], ["product-journey", "From idea to sale"], ["capabilities", "What I bring"], ["value", "The results"], ["build", "Where I can help"], ["opportunity", "What comes next"], ["education", "Education"], ["contact", "Let’s connect"]];
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

// A distinct, single scene per section. No duplicated background tiles.
for(const id of ['experience','build','value','product-journey']){
 const art=document.querySelector('#'+id+'>.section-art');if(art)art.replaceChildren();
}

// Overview navigation targets are created after the main section controls.
document.querySelectorAll('#how-work-grew,#career-master,#private-label-products').forEach(section=>navObserver.observe(section));
if(location.hash){const target=document.getElementById(location.hash.slice(1));if(target){requestAnimationFrame(()=>target.scrollIntoView({block:'start'}))}}
