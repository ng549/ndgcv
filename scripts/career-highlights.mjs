// Only confirmed facts from the approved CV-CANONICAL.md career stories.
// Each pair belongs to its tab; qualifications remain visible beside the number.
export const careerHighlights = {
 moremargin: [
  [['8-month flagship delivery','DJI Fifth Avenue: from the financial case through buildout and opening.'],['Built the investment case','Modeled the store on its own and as part of STC’s wider business.']],
  [['Integrated the store operation','Connected customer, warehouse, product-information and accounting systems.'],['Opened new retail channels','NuvoMed placements included Fun Town RV, Camping World and REI.'],['Developed the display program','Drive-aisle PDQ displays supporting Home Depot and Lowe’s expansion.']],
  [['$5M+ estimated revenue','My estimated contribution to NuvoMed over ten months.'],['Opened DJI Fifth Avenue','The flagship launched around February–March 2026 with city and headquarters approvals.']],
  [['Built usable business dashboards','Turned scattered small-business and e-commerce data into accessible reporting.'],['Earned repeat client work','STC and NuvoMed continue to call on me as new needs arise.']]
 ],
 funtown: [
  [['65,000 sq ft brought into use','Corsicana opened in March 2022, including about 10,000 sq ft of retail.'],['6 checkout lanes established','Retail, café and service functions in one facility.']],
  [['30,000+ SKUs unified','Built a shared product database for the retail operation.'],['2 house brands developed','KAMPTIME and USA Rec. Supply.'],['Top 50 products targeted','Prioritized high-selling items for factory-direct sourcing.']],
  [['$3M in sourcing sales','Internal sales generated in under one year.'],['28% → 79% product margin','Reported increase on selected factory-direct products: 51 percentage points.'],['6 locations, 2 divisions','Expanded the retail platform across the business.']],
  [['Built repeatable store standards','Created merchandising guides and operating processes for teams.'],['Connected sourcing to selling','Linked product records, ordering, logistics and store execution.']]
 ],
 bigbox: [
  [['20+ years of trading relationships','Applied an international network to sourcing and new sales channels.'],['Created the FitBox venture','Developed a shared-space business model for vacant big-box properties.']],
  [['Raised prototype capital','Secured funding for the first FitBox location, contingent on a lease.'],['Built the tenant economics','Worked through master rent, smaller leases and shared-facility costs.']],
  [['Returned the investors’ capital','Stopped before the planned lease signing when COVID changed the conditions.'],['No investor lost money','FitBox remained a funded concept; it did not open.']],
  [['Designed a new use for vacant space','Combined complementary tenants, smaller premises and shared facilities.'],['Avoided the lease commitment','Reassessed the venture before signing and returned the funds.']]
 ],
 campingworld: [
  [['$300M+ project scope','Cross-department leadership on the overall transformation program.'],['Led across 4 businesses','Coordinated hundreds of people across departments.']],
  [['20+ shop-in-shops developed','Turned broad outdoor categories into distinct retail destinations.'],['Led the initial store sets','Brought branding, layouts, products and merchandising onto the floor.'],['Developed private-label ranges','Connected suppliers, price points and assortments to customer needs.']],
  [['80+ stores in under 18 months','Rebuilt and merchandised through the wider Gander team program.'],['Indoor RV proposal adopted','Put oversized stores to work as RV sales space.'],['Developed the express format','Helped shape smaller dealerships and their delivery model.']],
  [['Created an alternative use for space','Proposed indoor RV sales instead of filling large stores with inventory.'],['Joined buying decisions to execution','Brought supplier, assortment, floor-space and team decisions together.']]
 ],
 lemonis: [
  [['Worked across ~80% of investments','Marcus’s family-office investments featured on The Profit.'],['Delivered business transformations','Coordinated owners, producers and specialist resources.']],
  [['Reduced fixture costs at Bentley’s','Replaced custom fabrication with ready-made fixtures and graphics.'],['Made openings easier to repeat','Developed a practical fixture approach for subsequent locations.']],
  [['~8,000 sq ft transformed','W82 redesign, branding, buildout and merchandising.'],['7 shops built into one store','Organized distinct product destinations within W82.'],['Delivered the Denim & Soul handoff','Transferred the concept and operating work to ML Fashion.']],
  [['Improved Bowery’s operating tools','Worked on layout, fixtures, SKU management and reporting.'],['Put shared resources to work','Connected businesses with suppliers and practical solutions used across the portfolio.']]
 ],
 courageb: [
  [['Co-founded and funded COURAGE. b','Started the business with my sister in 2008.'],['Built the stores myself','Handled leases, financing and the physical work of opening locations.']],
  [['~90% private-label merchandise','Built the early offer around directly sourced products.'],['7 production locations connected','France, Italy, China, India, Vietnam, New York and Los Angeles.'],['Took on all manufacturing','Managed production alongside logistics, tagging and pricing.']],
  [['Expanded across US markets','From Scarsdale to locations including New York, Palm Beach and Aspen.'],['Sold a stake to ML Fashion','Partial ownership sale followed by acquisitions and further openings.']],
  [['Built a profitable outlet channel','Created a separate route for discounted merchandise.'],['Net margins close to full-price stores','Including rent, in my experience of the outlet operation.']]
 ],
 sharperimage: [
  [['Recruited by The Sharper Image','Advertising account work led to a role that became Product Development Director.'],['Worked directly with the CEO','Helped shape product direction and merchandising priorities.']],
  [['Developed product and private-label offers','Worked across suppliers on products from air purifiers to the cooling neck band.'],['Coordinated 3 selling channels','Connected store displays with catalog and website presentation.']],
  [['~$1M a year negotiated','Secured vendor co-op funding for the catalog.'],['Helped develop the licensing approach','Worked on extending the brand to other manufacturers’ products; development was underway during my tenure.']],
  [['Turned product discovery into an offer','Connected supplier research with assortment and customer-facing presentation.'],['Brought suppliers into catalog funding','Negotiated commercial support alongside product partnerships.']]
 ],
 kbp: [
  [['Worked with the managing partners','Joined their special new-business unit as a Junior Analyst.'],['Assembled the agency’s pitch work','Brought departmental contributions together for new business and account growth.']],
  [['Priceline pitch work became campaign work','The physical trophies I made for the pitch became part of the actual campaign.'],['Supported 2 account expansions','Assembled the agency’s work for Edward Jones and Snapple.']],
  [['Helped win 4 named accounts','Team wins: Priceline, Mrs. Butterworth’s, Diageo and The Sharper Image.'],['Recruited directly by a client','The Sharper Image hired me from KBP.']],
  [['Made an idea the client used','Priceline carried my pitch trophies into its campaign.'],['Earned the move into product development','The Sharper Image relationship led directly to my next role.']]
 ]
};

export function withHighlights(markup, id, chapter, escape) {
 const items=careerHighlights[id][chapter];
 const list=`<ul class="career-highlights" aria-label="${escape(['Context','The Work','Outcome','Takeaway'][chapter])} highlights">${items.map(([lead,detail])=>`<li><strong>${escape(lead)}</strong><span>${escape(detail)}</span></li>`).join('')}</ul>`;
 return markup.replace(/<div class="chapter-media">[\s\S]*?<\/div>/,media=>`<aside class="career-evidence">${media}${list}</aside>`);
}
