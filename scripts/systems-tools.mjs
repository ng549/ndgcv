export const systemGroups = [
  {
    id: 'workflow-planning', heading: 'Understand the work first',
    preview: 'Define the operating need before choosing the tools.',
    bullets: [
      'I start with who needs to do what, what information they need, and where the next person gets held up.',
      'I trace the handoffs between stores, purchasing, online sales and fulfillment, looking for duplicate entry, disconnected records and unclear responsibilities.',
      'At Fun Town RV, separate location catalogs and inconsistent product identifiers helped define the need for shared information before I selected and connected the tools.'
    ],
    benefit: 'The operating need determines the system, so the tools support how the business actually works.',
    alt: 'Source-based sketch adaptation of the Fun Town RV planning photograph: plans on a wooden table beneath the exposed trusses of an unfinished retail space.'
  },
  {
    id: 'product-information', heading: 'Give product information a common structure',
    preview: 'Give purchasing, selling and reporting a shared foundation.',
    bullets: [
      'At Fun Town RV, I organized more than 30,000 stock-keeping units—individual product records—into a shared database for ordering and reporting.',
      'I connected product information with image files and the pricing matrix, giving the related applications and stores a consistent foundation.',
      'We used Google Workspace, mainly Sheets, for data input, output and dashboards. That gave the team a familiar way to work with the information supporting the operation.'
    ],
    benefit: 'Consistent records help purchasing, selling and reporting refer to the same products and pricing information.',
    alt: 'Concept illustration of product records, accessory imagery and pricing information at a working desk; not a historical database screenshot.'
  },
  {
    id: 'connected-channels', heading: 'Connect stores, orders and fulfillment',
    preview: 'Connect daily transactions across locations and channels.',
    bullets: [
      'I designed and initially implemented the connections between the product databases, supporting applications and Shopify stores.',
      'The broader retail setup brought together point of sale, online channels, internal ordering and fulfillment. It started at one location and expanded to six locations across two divisions.',
      'Much of the ongoing operation ran automatically. Dashboard reviews and health checks remained part of keeping it working.'
    ],
    benefit: 'Connected information supports execution across locations and channels, with oversight when something needs attention.',
    alt: 'New sketch adapted from the supplied Shopify point-of-sale tablet reference; illustrative software structure, not a photograph of a Fun Town deployment.'
  },
  {
    id: 'purchasing-replenishment', heading: 'Make purchasing and replenishment actionable',
    preview: 'Connect the buying decision with availability and delivery.',
    bullets: [
      'I developed an internal ordering portal for dealerships and head office, alongside automatic replenishment and third-party fulfillment arrangements.',
      'I organize product, supplier, cost and pricing information around the decisions people need to make: what to order, when it is needed and how it will reach the next location or customer.',
      'For imported products, I include import costs when assessing the economics, so purchasing decisions reflect more than the factory price.'
    ],
    benefit: 'Ordering and replenishment become part of an operating process that supports availability and margin discipline.',
    alt: 'Source-based sketch adaptation of the Fun Town logistics photograph, preserving wrapped carton stacks, pallets and the warehouse trusses.'
  },
  {
    id: 'operating-visibility', heading: 'Make performance and system health visible',
    preview: 'Use information to decide where attention is needed.',
    bullets: [
      'We used Google Sheets for dashboards and data flowing into and out of the operation.',
      'I used dashboards and health checks to oversee a system that was largely running on its own, identifying where attention was needed.',
      'My broader reporting work has followed the same principle: make information useful for a decision, then connect that decision to action and follow-through.'
    ],
    benefit: 'Visibility helps people direct their attention and decide what to do next.',
    alt: 'Concept illustration of a reporting workstation and review checklist, informed by the illustrative More Margin dashboard reference; no historical data or results shown.'
  },
  {
    id: 'repeatable-execution', heading: 'Make the work repeatable',
    preview: 'Give people a way of working they can maintain and improve.',
    bullets: [
      'I handled the architecture, plan and initial implementation, then delegated routine work to a small team.',
      'Alongside the systems, I developed layouts, planograms and merchandising guides to help stores put the approach into practice consistently.',
      'I connect the tools with instructions, responsibilities and team feedback, so the operation can keep improving as people use it.'
    ],
    benefit: 'The organization gains a way of working that people can understand, maintain and repeat.',
    alt: 'Concept illustration of an open merchandising guide, shelf-layout drawing and floor plan; not a reproduction of a historical operating document.'
  }
];

export function systemsTools(e) {
  return `<section class="systems-section" id="ai" aria-labelledby="systems-heading">
    <div class="systems-backdrop" aria-hidden="true" data-parallax="0.12"></div>
    <div class="shell">
      <div class="section-heading">
        <span class="eyebrow">Connecting information, people and daily execution.</span>
        <h2 id="systems-heading">Make the business easier to run.</h2>
        <p>I organize the information, workflows and tools that help a business operate day to day. I start with what people need to accomplish, then connect the records, transactions and responsibilities that support the work.</p>
        <p>At Fun Town RV, I designed the system architecture and carried out the initial implementation, connecting product databases, image files, pricing information, applications and Shopify stores. A small team then handled routine implementation work. The operation ran largely automatically, with dashboard and health-check oversight.</p>
      </div>
      <p class="systems-instruction">Explore the approach. Open a heading for the work behind it.</p>
      <div class="systems-groups">
        ${systemGroups.map((g,i) => `<details class="systems-group" id="systems-${g.id}" ${i===0?'open':''}>
          <summary><span><strong>${e(g.heading)}</strong><span class="systems-preview">${e(g.preview)}</span></span><span class="systems-disclosure" aria-hidden="true"></span></summary>
          <div class="systems-body">
            <div class="systems-copy"><ul>${g.bullets.map(b=>`<li>${e(b)}</li>`).join('')}</ul><p class="systems-benefit"><strong>Why it matters:</strong> ${e(g.benefit)}</p></div>
            <a class="systems-image" href="assets/systems/section-17-${g.id}.webp" target="_blank" rel="noopener" aria-label="Open ${e(g.heading.toLowerCase())} illustration at full size" title="${e(g.alt)}"><img src="assets/systems/section-17-${g.id}.webp" alt="${e(g.alt)}" width="1200" height="800" loading="lazy" decoding="async"></a>
          </div>
        </details>`).join('')}
      </div>
    </div>
  </section>`;
}
