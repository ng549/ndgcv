import {toolReasons} from './playbooks.mjs';
const stages=[
['need','Define what needs to work',[
'I start with the person using the tool: what they need to accomplish, what information they need and what gets in their way.',
'I turn that need into requirements, including essential functions, practical constraints and the situations the tool must handle.',
'Merchant PRO brings this approach into software: connecting purchasing, sourcing, landed cost and inventory decisions around the questions a merchant needs answered.'
],'Development starts with a useful outcome and a clear basis for judging the result.',['Google Sheets','Google Drive']],
['research','Research before building',[
'I investigate existing products, open-source components and available integrations before deciding what needs custom development.',
'I use AI research tools to explore options and challenge assumptions, then examine the supporting information and trade-offs.',
'I consider how a component will fit the wider system, including its maintenance requirements and the work needed to connect it.'
],'I can focus development effort on what makes the solution useful while drawing on existing capabilities.',['ChatGPT','Claude','Grok','Perplexity','Gemini']],
['design','Design the experience and organize the work',[
'I map the information, screens and decisions into a workflow someone can follow.',
'I use interactive prototypes to examine the experience and communicate changes before developing it further.',
'I divide larger projects into defined tasks, with shared requirements and recorded decisions so separate pieces can come together coherently.'
],'The intended behavior becomes something people can inspect, discuss and improve.',['Claude Design','Canva','Slack','Nano Banana Pro','Seedream','Seedance','Magnific','Topaz Gigapixel']],
['build','Build with the right tools for the task',[
'I work with AI tools across research, design, implementation and review, giving each a defined purpose and relevant project context.',
'I bring model access, development environments, data services, communication, payments and hosting into the same working system.',
'I coordinate the work and review its outputs. Where I manage separate AI sessions, that coordination remains part of my own contribution.',
'I preserve code and decisions in shared project records so work can continue across sessions and revisions.'
],'The tools expand my ability to develop an idea while I maintain the product direction and priorities.',['Claude Code','Codex','Grok Build','Open Claw','Factory','Replit','Plugsky','OpenRouter','Supabase','Apps Script','Stripe']],
['test','Test it through use',[
'I personally use and test the projects, checking whether the experience behaves as intended and supports the task.',
'I identify missing steps, confusing interactions and defects, then turn those findings into specific revisions.',
'I review automated test results alongside my own testing; each provides a different kind of evidence.',
'I’m developing a test team to broaden the review as the projects become more substantial.'
],'Testing informs the next improvement and helps establish what is ready for use.',['GitHub Actions']],
['release','Release, learn and improve',[
'I use version control, deployment tools and documentation to preserve changes and make working versions available for review.',
'I distinguish designs, interactive prototypes, working tools and released applications according to what each project actually demonstrates.',
'I continue refining the projects through use, testing and feedback, carrying useful lessons into the next build.'
],'Each release becomes a foundation for further development, with its capabilities and remaining work understood.',['GitHub','Vercel','Domo','Power BI']]
];
const reasons={...toolReasons,
'GitHub':'I use GitHub to preserve source code, decisions and handoffs. It keeps a durable project record that I or a collaborator can pick up.',
'Plugsky':'I use Plugsky as one route to the AI models supporting my development work. It sits within my wider system of tools, with the task determining which capability I use.',
'OpenRouter':'I use OpenRouter to access different AI models through a common connection. It gives me flexibility when choosing a model for a particular piece of work.',
'Factory':'I use Factory for AI-assisted development tasks. I define the work, review the implementation and test results, and direct the next revision.',
'Replit':'I use Replit to build and iterate on applications. It gives me a working environment where I can make an idea tangible and test how it behaves.',
'Supabase':'I use Supabase for the data and backend side of applications. I work through what information the product needs and how that supports its workflow.',
'Vercel':'I use Vercel to deploy applications and make versions available for review. That lets me examine the experience beyond the development environment.',
'Slack':'I use Slack for communication and coordination within my wider working system, keeping discussion connected to the work in progress.',
'Stripe':'I use Stripe for the payment side of relevant projects, connecting the commercial requirements with the application experience.'};
const alts={need:'Concept illustration — a product sample and requirements brief',research:'Concept illustration — comparing existing components before choosing an approach',design:'Illustrated interface study adapted from the ATOMIQ design reference; not an exact software screenshot',build:'Concept illustration — assembling separate modules into a coherent whole',test:'Concept illustration informed by ATOMIQ — testing a music interface; equipment is illustrative',release:'Concept illustration — reviewing an editorial website across screen sizes',merchant:'Concept illustration informed by Merchant PRO’s product thesis — samples, purchasing and landed cost',atomiq:'Illustrated adaptation of the ATOMIQ performance interface; original screenshot retained in the project evidence',website:'Concept illustration of this website’s editorial presentation; not a screenshot'};
export function buildProcess(e,d,img){
 const logos=new Map(d.aiStoryData.flatMap(g=>g.tools).map(t=>[t.name,t.logo]));
 const bullets=items=>`<ul>${items.map(s=>`<li>${e(s)}</li>`).join('')}</ul>`;
 const artwork=slug=>`<a class="build-image" href="assets/build-process/section-18-${slug}.webp" target="_blank" rel="noopener" title="${e(alts[slug])}">${img(`assets/build-process/section-18-${slug}.webp`,alts[slug])}</a>`;
 const tools=names=>`<div class="build-tools">${names.map(name=>{const id='s18-tool-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-');return `<div class="tool-item"><button type="button" class="tool-trigger" aria-expanded="false" aria-controls="${id}">${logos.has(name)?img(logos.get(name),''):''}<span>${e(name)}</span></button><div class="tool-tooltip" id="${id}" hidden><strong>How I use ${e(name)}</strong><p>${e(reasons[name])}</p></div></div>`}).join('')}</div>`;
 return `<div id="process" class="section-heading"><span class="eyebrow">Operating experience, applied to software.</span><h2>From understanding the problem<br>to building the tool.</h2><p>I’m extending my experience in products, stores and operating systems into software development. I define what a tool needs to accomplish, shape how it should work, and build it with AI assistance. My contribution connects the business need, the user’s experience and the decisions required to bring the pieces together.</p><p>I use different tools within one unified working system. I personally build, use and test the projects, then direct revisions based on what I find. I’m also developing a test team to broaden that review as the projects grow.</p></div><p id="ecosystem" class="build-instruction">Explore each stage. Hover, focus or tap a tool to see how I use it.</p><div class="build-stages">${stages.map(([slug,title,items,benefit,names],i)=>`<details class="build-group" id="build-stage-${slug}" ${i===0?'open':''}><summary><strong>${e(title)}</strong><span class="build-disclosure" aria-hidden="true"></span></summary><div class="build-body"><div class="build-copy">${bullets(items)}<p class="build-benefit"><strong>Why it matters.</strong> ${e(benefit)}</p>${tools(names)}</div>${artwork(slug)}</div></details>`).join('')}</div>`;
}
