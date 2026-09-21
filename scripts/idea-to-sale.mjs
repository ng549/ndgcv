export const stages = [
  {
    id: 'opportunity', title: 'Identify the opportunity',
    bullets: [
      'I start with the customer, the need and what is already available—looking for a useful gap in the offer or a new route to market.',
      'I draw on the team’s knowledge, sales information and supplier relationships to understand where the business has a reason to compete.'
    ],
    example: 'New retail channels for NuvoMed', role: 'moremargin',
    alt: "Concept illustration of an empty assortment niche and customer observation cards; not an actual client display."
  },
  {
    id: 'economics', title: 'Make the numbers work',
    bullets: [
      'I work through selling price, product and delivery costs, margin, inventory commitments and the resources needed to proceed.',
      'I consider the wider business as well as the individual offer. For DJI, we evaluated the store on its own and its expected contribution to STC’s existing operation.'
    ],
    example: 'The DJI commercial case', role: 'moremargin',
    alt: "Concept illustration of a balance scale weighing a carton against resource blocks; not actual financial results."
  },
  {
    id: 'offer', title: 'Develop the offer',
    bullets: [
      'I connect product selection and development with positioning, packaging and the way the customer will buy and use the offer.',
      'I work with suppliers and specialists on specifications, samples, pricing and supply arrangements, keeping delivery and selling requirements in view.'
    ],
    example: 'Fun Town’s house-brand products', role: 'funtown',
    alt: "Concept illustration of material swatches, packaging development and an unbranded lantern prototype; not a product Nicolas is claimed to have developed."
  },
  {
    id: 'operation', title: 'Build the operation',
    bullets: [
      'I coordinate the people, partners and systems needed to deliver—from store setup and product records to ordering, inventory and fulfillment.',
      'I connect the sales channels with the operation behind them, working with teams on training, replenishment and the handoffs they will manage.'
    ],
    example: 'Fun Town’s connected retail operation', role: 'funtown',
    alt: "Concept illustration of an order handoff organizer and picking basket; not an actual client operation."
  },
  {
    id: 'launch', title: 'Launch and improve',
    bullets: [
      'I stay involved as the offer reaches customers, working with the team through the practical details of opening, availability and selling.',
      'I use sales, margin, inventory and operating information to revisit the assortment, replenishment and customer channels as the business develops.'
    ],
    example: 'The DJI opening and ongoing work', role: 'moremargin',
    alt: "Concept illustration of an unbranded lantern display and feedback cards; not an actual client launch."
  }
];

export function ideaToSale(e) {
  return `<section class="brand-story idea-sale-section" id="product-journey" aria-labelledby="idea-sale-heading"><div class="shell"><div class="section-heading"><span class="eyebrow">Connecting the idea with the operation</span><h2 id="idea-sale-heading">From idea to sale</h2><p>I bring the commercial decisions and the practical work together, from shaping an offer to getting it into customers’ hands. These parts overlap: I work through them with the people responsible, returning to earlier decisions as we learn more.</p></div><div class="idea-stages">${stages.map(s=>`<details class="idea-stage" id="idea-stage-${s.id}" open><summary><h3>${e(s.title)}</h3><span class="idea-disclosure" aria-hidden="true"></span></summary><div class="idea-body"><div class="idea-copy"><ul>${s.bullets.map(b=>`<li>${e(b)}</li>`).join('')}</ul><a class="idea-evidence" href="#role-${s.role}">${e(s.example)} <span aria-hidden="true">↗</span></a></div><a class="idea-image" href="assets/idea-to-sale/${s.id}-v2.png" target="_blank" rel="noopener" aria-label="Open ${e(s.title.toLowerCase())} illustration at full size" title="${e(s.alt)}"><img src="assets/idea-to-sale/${s.id}-v2.png" alt="${e(s.alt)}" width="1536" height="1024" loading="lazy" decoding="async"></a></div></details>`).join('')}</div></div></section>`;
}
