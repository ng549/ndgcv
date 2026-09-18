import {technologyHelp} from './how-i-can-help-technology.mjs';
export const contributions = [
  {
    id: 'launch', title: 'Build and launch new offerings', role: 'moremargin',
    copy: 'When an opportunity has promise but no clear route into operation, I connect the business model with the work required to launch it. I work through the customer offer, margins, suppliers, people, systems and delivery plan with the team. The aim is a proposition the business can resource and run, with the important dependencies understood before commitments grow.',
    example: 'For DJI’s Fifth Avenue flagship, I worked from the financial case through layout, build coordination, training, replenishment and systems integration to opening.',
    alt: 'Adapted sketch of the DJI Fifth Avenue storefront, based on the source photograph.'
  },
  {
    id: 'economics', title: 'Improve product and margin economics', role: 'funtown',
    copy: 'When the offer is selling but the economics need attention, I look at assortment, sourcing, pricing and inventory together. I can develop direct-sourcing and private-label opportunities, work through supplier terms, and help teams decide what to carry, change or stop buying. The aim is a stronger product offer with clearer economics and more deliberate inventory commitments.',
    example: 'At Fun Town RV, I connected factory-direct sourcing with two house brands. Reported margin on selected products increased from 28% to 79%.',
    alt: 'Adapted sketch of KAMPTIME product cartons on pallets, based on the source photograph.'
  },
  {
    id: 'expansion', title: 'Turn expansion plans into working operations', role: 'funtown',
    copy: 'When a business is adding locations or sales channels, I bring together the physical setup and the operation behind it. That includes layouts and merchandising where relevant, product records, ordering, logistics, selling systems and team readiness. The aim is an opening or expansion that people can operate consistently, with practical standards they can use again.',
    example: 'At Fun Town RV, my store-development brief expanded into a connected retail platform across six locations and two divisions, including e-commerce, fulfillment and replenishment.',
    alt: 'Adapted sketch of the unfinished retail space and planning table, based on the source photograph; not a completed store.'
  },
  {
    id: 'integration', title: 'Make operational change work after an acquisition', role: 'lemonis',
    copy: 'When an acquired business needs to join a wider operation, I work through what should connect, what needs to change and what is worth preserving. I listen to the people doing the work, then help coordinate changes to the offer, branding, locations, product information and operating routines. The aim is a workable transition that retains useful knowledge and gives teams clear handoffs.',
    example: 'For Denim & Soul, I developed the concept and rebrand, worked through technology, store builds and merchandising, and carried the transformation through to its handoff to ML Fashion.',
    alt: 'Adapted sketch of the Denim & Soul storefront, based on the source photograph.'
  },
  {
    id: 'coordination', title: 'Coordinate execution across several businesses', role: 'lemonis',
    copy: 'When several businesses need attention at once, I help owners identify the next practical steps and bring together the people, suppliers and specialist resources needed to take them. I look for solutions that can be shared while respecting how each business works. The aim is to make better use of available resources and help teams deliver without starting from scratch every time.',
    example: 'Working with Marcus Lemonis, I helped develop plans, coordinate owners and producers, and find resources across different businesses. Assignments ranged from Bowery’s store layout and product reporting to Bentley’s simpler, lower-cost fixture approach.',
    alt: 'Adapted sketch of Bowery Kitchen Supplies’ knife wall and display counter, based on the source photograph.'
  }
];
export const helpIntro = [
  'I help owners and leadership teams turn an opportunity into something the business can operate. That can mean a new offering, better product economics, an expansion, or several businesses that need their people, resources and systems to work together.',
  'I can take responsibility within one business or across a group, where experience and relationships from one company can help another move forward. I work with owners and teams to understand the need, agree the priorities and resources, and stay involved through implementation.'
];
export function howICanHelp(e) {
  return `<div class="help-content"><div class="section-heading help-intro"><span class="eyebrow">Connecting opportunity with execution</span><h2>Building what comes next.<br>Making it work across the business.</h2>${helpIntro.map(p=>`<p>${e(p)}</p>`).join('')}</div><div class="help-areas">${contributions.map(c=>`<article class="help-area" id="help-${c.id}" aria-labelledby="help-${c.id}-title"><h3 id="help-${c.id}-title">${e(c.title)}</h3><div class="help-passage"><div class="help-copy"><p>${e(c.copy)}</p><p class="help-example"><strong>From my experience:</strong> ${e(c.example)}</p><a class="help-evidence" href="#role-${c.role}">See the career example <span aria-hidden="true">↗</span></a></div><a class="help-image" href="illustrations/how-i-can-help-${c.id}.webp" target="_blank" rel="noopener" title="${e(c.alt)} Open full-size sketch"><img src="illustrations/how-i-can-help-${c.id}.webp" width="1200" height="800" loading="lazy" decoding="async" alt="${e(c.alt)}"></a></div></article>`).join('')}${technologyHelp(e)}</div></div>`;
}
