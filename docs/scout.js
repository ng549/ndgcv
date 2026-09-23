(()=>{
 const widget=document.querySelector('.scout-widget');if(!widget)return;
 const toggle=widget.querySelector('.scout-toggle'),pause=widget.querySelector('.scout-pause'),bubble=widget.querySelector('.scout-bubble'),close=widget.querySelector('.scout-close'),copy=widget.querySelector('.scout-copy'),choices=widget.querySelector('.scout-choices'),back=widget.querySelector('.scout-back'),home=widget.querySelector('.scout-home'),media=matchMedia('(prefers-reduced-motion: reduce)');
 const link=(label,href)=>({label,href});
 const next=(label,node)=>({label,next:node});
 const nodes={
  home:{state:'greeting',copy:'Hi, I’m Scout, your guide. What can I help you with today?',choices:[
   next('Explore Nicolas’s background','background'),next('Find relevant examples','examples'),next('Discuss a role or project','role'),next('Build a solution or tool','solution'),next('Contact Nicolas','contact'),next('Request references','references'),next('Something else','other')
  ]},
  background:{state:'listening',copy:'Of course. Would you like a short overview, or are you interested in a particular part of Nicolas’s background?',choices:[
   next('Short overview','background-overview'),link('Career story','/#experience'),link('Leadership and operations','/#ai'),link('Retail, products, and sourcing','/#product-journey'),link('Education and personal background','/#education')
  ]},
  'background-overview':{state:'speaking',copy:'Nicolas is a business-building and operations leader whose experience connects new concepts with the practical work required to launch and run them. His background includes business ownership, product development, sourcing, store launches, e-commerce, acquisition integration, and business systems.',choices:[
   link('How the work grew','/#experience'),link('Explore his experience','/#career-master'),link('See what he brings','/#capabilities'),next('Contact Nicolas','contact')
  ]},
  examples:{state:'listening',copy:'What kind of example would be most useful?',choices:[
   next('Launching a business','example-launch'),next('Developing products','example-products'),next('Improving operations','example-operations'),next('Sourcing','example-products'),next('Retail development','example-retail'),next('Systems and tools','example-systems'),next('Something else','example-other')
  ]},
  'example-launch':{state:'speaking',copy:'The career story shows how Nicolas moved from products and retail into business ownership, new concepts, store launches, and connected operations.',choices:[link('How the work grew','/#experience'),link('Explore all eight roles','/#career-master'),next('Contact Nicolas','contact')]},
  'example-products':{state:'speaking',copy:'The product journey and career stories document product development, private label, global sourcing, commercial terms, landed cost, allocation, and routes to market.',choices:[link('See the product journey','/#product-journey'),link('Explore his experience','/#career-master'),next('Contact Nicolas','contact')]},
  'example-operations':{state:'speaking',copy:'Nicolas’s documented work connects people, information, workflows, and practical systems across retail, e-commerce, acquisitions, and operating teams.',choices:[link('See how he works','/#ai'),link('Review the results','/#value'),next('Contact Nicolas','contact')]},
  'example-retail':{state:'speaking',copy:'The CV includes documented examples involving stores, merchandising, customer experience, e-commerce, product ranges, and retail operations.',choices:[link('Explore his experience','/#career-master'),link('See the product journey','/#product-journey'),next('Contact Nicolas','contact')]},
  'example-systems':{state:'speaking',copy:'The CV describes dashboards, connected workflows, decision tools, and software Nicolas builds to make business work easier and more reliably.',choices:[link('Building with AI','/#software-work'),link('Where Nicolas can help','/#build'),next('Contact Nicolas','contact')]},
  'example-other':{state:'unknown',copy:'I don’t want to force a connection without a verified example. You can explore the documented work or send Nicolas the specific question.',choices:[link('Explore the CV','/#career-master'),next('Send Nicolas a question','contact')]},
  role:{state:'listening',copy:'I can help you compare the opportunity with Nicolas’s documented experience. Is this a leadership role, consulting engagement, or a specific project?',choices:[
   next('Leadership role','role-need'),next('Consulting engagement','role-need'),next('Specific project','role-need')
  ]},
  'role-need':{state:'clarifying',copy:'What is the organization trying to build, change, or solve?',choices:[
   next('Build a new business or offering','role-fit'),next('Improve operations','role-fit'),next('Integrate or scale businesses','role-fit'),next('Develop products or channels','role-fit'),next('Share the full opportunity','contact')
  ]},
  'role-fit':{state:'speaking',copy:'Relevant documented experience includes business building, product development, sourcing, store launches, acquisition integration, e-commerce, and connected operations. I cannot confirm interest, availability, or fit on Nicolas’s behalf, but I can help you contact him.',choices:[
   link('Review his experience','/#career-master'),link('See what comes next','/#opportunity'),next('Contact Nicolas','contact')
  ]},
  solution:{state:'listening',copy:'What business problem or workflow are you trying to improve?',choices:[
   next('Reduce manual work','solution-users'),next('Improve visibility','solution-users'),next('Connect a workflow','solution-users'),next('Make faster decisions','solution-users'),next('Build a customer or product tool','solution-users'),next('Something else','solution-users')
  ]},
  'solution-users':{state:'clarifying',copy:'Who uses the current process, and where does the information live today?',choices:[
   next('One team','solution-outcome'),next('Several teams','solution-outcome'),next('Customers or partners','solution-outcome'),next('I’m not sure yet','solution-outcome')
  ]},
  'solution-outcome':{state:'clarifying',copy:'What would a useful result look like?',choices:[
   next('Less manual work','solution-summary'),next('Better visibility','solution-summary'),next('A connected workflow','solution-summary'),next('Faster decisions','solution-summary'),next('A practical custom tool','solution-summary')
  ]},
  'solution-summary':{state:'speaking',copy:'This sounds like a potential fit for Nicolas’s work connecting business needs, data, people, and practical tools. This is an initial conversation, not a delivery commitment or estimate.',choices:[
   link('See relevant capabilities','/#build'),link('Explore software work','/#software-work'),next('Prepare an inquiry','contact')
  ]},
  contact:{state:'confirmation',copy:'I can help you contact Nicolas. Nothing is submitted automatically; you choose the contact method and review your message before sending it.',choices:[
   link('Open contact options','/connect'),link('Email Nicolas','mailto:ngoureau@mac.com?subject=Website%20inquiry'),link('Return to the CV','/#contact')
  ]},
  references:{state:'confirmation',copy:'Nicolas reviews every reference request personally, chooses any appropriate references, and decides what information may be shared. No reference details are released automatically.',choices:[
   link('Prepare a reference email','mailto:ngoureau@mac.com?subject=Reference%20request'),link('Open contact options','/connect'),next('Review the privacy boundary','reference-boundary')
  ]},
  'reference-boundary':{state:'boundary',copy:'Scout never displays private reference identities or contact details, and never contacts references. Your request goes only to Nicolas for his review.',choices:[
   link('Prepare a reference email','mailto:ngoureau@mac.com?subject=Reference%20request'),next('Explore something else','home')
  ]},
  other:{state:'listening',copy:'Of course. Choose the closest option, and I’ll point you in the right direction.',choices:[
   next('Public background information','background'),next('A relevant example','examples'),next('A role or project','role'),next('A business solution or tool','solution'),next('Contact or references','contact'),next('What Scout can do','about-scout')
  ]},
  'about-scout':{state:'boundary',copy:'I’m Scout, an automated guide to Nicolas Goureau’s Interactive CV. I use fixed choices and verified public information. I do not access private records, store this conversation, or submit anything automatically.',choices:[
   next('Return to the main choices','home'),link('Open the CV','/#profile')
  ]}
 };
 let manual=false,blinkTimer,closing,excitedTimer,current='home';const history=[];
 const stopped=()=>manual||media.matches||document.hidden;
 function scheduleBlink(){blinkTimer=setTimeout(()=>{if(stopped())return;widget.classList.add('is-blinking');closing=setTimeout(()=>{widget.classList.remove('is-blinking');if(!stopped())scheduleBlink()},145)},2800+Math.random()*3400)}
 function sync(){[blinkTimer,closing].forEach(clearTimeout);widget.classList.remove('is-blinking','is-excited');clearTimeout(excitedTimer);widget.classList.toggle('is-paused',stopped());pause.setAttribute('aria-pressed',String(manual||media.matches));pause.disabled=media.matches;pause.innerHTML='<span aria-hidden="true">'+(manual||media.matches?'▶':'⏸')+'</span>';pause.setAttribute('aria-label',media.matches?'Motion reduced by device settings':manual?'Play Scout animation':'Pause Scout animation');if(!stopped())scheduleBlink()}
 function choiceControl(choice){
  const control=document.createElement(choice.href?'a':'button');control.className='scout-choice';control.textContent=choice.label;
  if(choice.href)control.setAttribute('href',choice.href);else{control.type='button';control.dataset.scoutNext=choice.next}
  return control;
 }
 function render(id,remember=true){
  const node=nodes[id]||nodes.home;if(remember&&id!==current)history.push(current);current=id;widget.dataset.scoutState=node.state||'speaking';copy.textContent=node.copy;choices.replaceChildren(...node.choices.map(choiceControl));back.hidden=!history.length;home.hidden=id==='home';
 }
 function show(open,restore=false){bubble.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close Scout guide':'Open Scout guide');if(open)requestAnimationFrame(()=>choices.querySelector('.scout-choice')?.focus({preventScroll:true}));if(restore)toggle.focus()}
 toggle.addEventListener('click',()=>{show(bubble.hidden);if(!stopped()){clearTimeout(excitedTimer);widget.classList.remove('is-excited');void widget.offsetWidth;widget.classList.add('is-excited');excitedTimer=setTimeout(()=>widget.classList.remove('is-excited'),2400)}});
 choices.addEventListener('click',event=>{const control=event.target.closest('.scout-choice');if(!control)return;if(control.dataset.scoutNext){render(control.dataset.scoutNext);copy.focus({preventScroll:true})}else show(false)});
 back.addEventListener('click',()=>{const previous=history.pop()||'home';render(previous,false);copy.focus({preventScroll:true})});
 home.addEventListener('click',()=>{history.length=0;render('home',false);copy.focus({preventScroll:true})});
 close.addEventListener('click',()=>show(false,true));document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!bubble.hidden)show(false,true)});document.addEventListener('pointerdown',event=>{if(!widget.contains(event.target)&&!bubble.hidden)show(false)});
 pause.addEventListener('click',()=>{manual=!manual;sync()});media.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);render('home',false);sync();
})();
