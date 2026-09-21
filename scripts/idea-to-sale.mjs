export const stages = [
  {
    id: 'opportunity', title: 'Identify the opportunity',
    bullets: [
      'I start with the customer, the need and what is already available—looking for a useful gap in the offer or a new route to market.',
      'I draw on the team’s knowledge, sales information and supplier relationships to understand where the business has a reason to compete.'
    ],
    example: 'New retail channels for NuvoMed', role: 'moremargin',
    products: "Nepallo \u00b7 Outfitta \u00b7 Forge",
    alt: "Source-based editorial sketch of Nepallo \u00b7 Outfitta \u00b7 Forge. Adapted from preserved private-label product images; the arrangement is illustrative, not an actual store display."
  },
  {
    id: 'economics', title: 'Make the numbers work',
    bullets: [
      'I work through selling price, product and delivery costs, margin, inventory commitments and the resources needed to proceed.',
      'I consider the wider business as well as the individual offer. For DJI, we evaluated the store on its own and its expected contribution to STC’s existing operation.'
    ],
    example: 'The DJI commercial case', role: 'moremargin',
    products: "Grill World \u00b7 Tow Center \u00b7 Venture Forward",
    alt: "Source-based editorial sketch of Grill World \u00b7 Tow Center \u00b7 Venture Forward. Adapted from preserved private-label product images; the arrangement is illustrative, not an actual store display."
  },
  {
    id: 'offer', title: 'Develop the offer',
    bullets: [
      'I connect product selection and development with positioning, packaging and the way the customer will buy and use the offer.',
      'I work with suppliers and specialists on specifications, samples, pricing and supply arrangements, keeping delivery and selling requirements in view.'
    ],
    example: 'Fun Town’s house-brand products', role: 'funtown',
    products: "Temp360 \u00b7 Heated base layers, socks and glove liners",
    alt: "Source-based editorial sketch of Temp360 \u00b7 Heated base layers, socks and glove liners. Adapted from preserved private-label product images; the arrangement is illustrative, not an actual store display."
  },
  {
    id: 'operation', title: 'Build the operation',
    bullets: [
      'I coordinate the people, partners and systems needed to deliver—from store setup and product records to ordering, inventory and fulfillment.',
      'I connect the sales channels with the operation behind them, working with teams on training, replenishment and the handoffs they will manage.'
    ],
    example: 'Fun Town’s connected retail operation', role: 'funtown',
    products: "Dockmate \u00b7 Covermate",
    alt: "Source-based editorial sketch of Dockmate \u00b7 Covermate. Adapted from preserved private-label product images; the arrangement is illustrative, not an actual store display."
  },
  {
    id: 'launch', title: 'Launch and improve',
    bullets: [
      'I stay involved as the offer reaches customers, working with the team through the practical details of opening, availability and selling.',
      'I use sales, margin, inventory and operating information to revisit the assortment, replenishment and customer channels as the business develops.'
    ],
    example: 'The DJI opening and ongoing work', role: 'moremargin',
    products: "Simple Nest \u00b7 Gladiator \u00b7 Trophy Boss \u00b7 Flex \u00b7 Sakana",
    alt: "Source-based editorial sketch of Simple Nest \u00b7 Gladiator \u00b7 Trophy Boss \u00b7 Flex \u00b7 Sakana. Adapted from preserved private-label product images; the arrangement is illustrative, not an actual store display."
  }
];

const additionalGroups = {
  opportunity: {id:'apparel-extra', brands:'Ultimate Terrain · Lazy Mondays · Suntide', title:'Outdoor and leisure apparel'},
  economics: {id:'camping-extra', brands:'Camper’s Choice · Erehwon · Perma Chill', title:'Camping and coolers', note:'Erehwon is shown as an in-development concept in the 2016 brand kit.'},
  offer: {id:'field-extra', brands:'Hunter’s Choice · Guide Series · Sportsman 365 · Flock Boss', title:'Fieldwear and accessories'},
  operation: {id:'marine-extra', brands:'Shademate · Toonmate', title:'Pontoon seating and shade hardware'}
};
function productImage(e,id,brands,note='') {
  const alt=`Editorial sketch of ${brands}. Adapted from original private-label product and packaging references; an illustrative grouping.`;
  return `<figure class="private-label-sketch"><a class="idea-image" href="assets/idea-to-sale/${id}-private-label.png" target="_blank" rel="noopener" aria-label="Open ${e(brands)} sketch at full size"><img src="assets/idea-to-sale/${id}-private-label.png" alt="${e(alt)}" width="1536" height="1024" loading="lazy" decoding="async"></a><figcaption class="private-label-caption">${e(brands)}</figcaption></figure>`;
}
export function ideaToSale(e) {
  return `<section class="brand-story idea-sale-section" id="product-journey" aria-labelledby="idea-sale-heading"><div class="shell"><div class="section-heading" id="connecting-ideas"><span class="eyebrow">Connecting the idea with the operation</span><h2 id="idea-sale-heading">From idea to sale</h2><p>I bring the commercial decisions and the practical work together, from shaping an offer to getting it into customers’ hands. These parts overlap: I work through them with the people responsible, returning to earlier decisions as we learn more.</p></div><ol class="idea-stages">${stages.map(s=>{
    return `<li class="idea-stage" id="idea-stage-${s.id}"><div class="idea-stage-heading"><h3>${e(s.title)}</h3></div><div class="idea-body"><div class="idea-copy"><ul>${s.bullets.map(b=>`<li>${e(b)}</li>`).join('')}</ul><a class="idea-evidence" href="#role-${s.role}">${e(s.example)} <span aria-hidden="true">↗</span></a></div></div></li>`;
  }).join('')}</ol><details class="private-label-gallery" id="private-label-products"><summary><h3>Private-label products</h3><span class="intro-toggle" aria-hidden="true"></span></summary><div class="private-label-grid">${stages.map(s=>{const more=additionalGroups[s.id];return productImage(e,s.id,s.products)+(more?productImage(e,more.id,more.brands):'')}).join('')}</div></details></div></section>`;
}
