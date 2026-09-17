// Only confirmed facts from the approved CV-CANONICAL.md career stories.
// Each pair belongs to its tab; qualifications remain visible beside the number.
export const careerHighlights = {
 moremargin: [
  [['8 months','DJI flagship engagement, 2025–2026.'],['Opened','Fifth Avenue store launched around February–March 2026.']],
  [['Connected','Store layout, training, replenishment and STC systems.'],['New channels','NuvoMed outdoor retail and home-improvement display program.']],
  [['$5M+','My estimated NuvoMed revenue contribution over ten months.'],['Launched','DJI flagship opened with city and headquarters approvals.']],
  [['Built','Dashboards for small businesses and e-commerce.'],['Made usable','Scattered information brought into accessible reporting.']]
 ],
 funtown: [
  [['65,000 sq ft','Corsicana facility opened March 2022; about 10,000 sq ft retail.'],['6 checkout lanes','Retail, café and service functions brought together.']],
  [['30,000+ SKUs','Organized into a shared product database.'],['2 house brands','KAMPTIME and USA Rec. Supply; top 50 products targeted for direct sourcing.']],
  [['$3M','Internal sourcing sales in under one year.'],['28% → 79%','Reported margin on selected factory-direct products: +51 percentage points.'],['6 locations','Retail platform expanded across two divisions.']],
  [['Connected','Sourcing, store standards, sales, ordering and logistics.'],['Delivered','Merchandising guides and processes for teams to use.']]
 ],
 bigbox: [
  [['20+ years','International relationships brought into sourcing and channel work.'],['Created','FitBox: a new operating model for vacant retail space.']],
  [['Capital raised','First FitBox prototype funding, contingent on a lease.'],['Model developed','Smaller tenant spaces and shared facilities within a master lease.']],
  [['Funds returned','FitBox stopped before lease signing when COVID changed the plan.'],['No investor lost money','The prototype did not reach an operating launch.']],
  [['Commercial model built','Space, shared costs and tenant economics considered together.'],['Commitment avoided','Stopped before signing and returned the capital.']]
 ],
 campingworld: [
  [['$300M+','Overall project scale; cross-department leadership.'],['Hundreds of people','Led across departments and four businesses.']],
  [['20+ concepts','Category shop-in-shops developed.'],['Led delivery','Connected branding, products, layouts, merchandising and initial store sets.']],
  [['80+ stores','Wider Gander team program: rebuilt and merchandised in under 18 months.'],['Adopted','My proposal to use larger stores for indoor RV sales.'],['Express model','Helped develop the smaller dealership and delivery approach.']],
  [['Space rethought','RV sales offered an alternative to filling large stores with inventory.'],['Decisions connected','Product, supplier, floor-space and team execution brought together.']]
 ],
 lemonis: [
  [['~80%','Involvement in Marcus’s family-office investments featured on The Profit.'],['Builds delivered','Coordinated owners, producers and resources for transformations.']],
  [['Lower-cost openings','Ready-made fixtures plus graphics replaced expensive custom fabrication at Bentley’s.'],['Resources shared','Suppliers and practical solutions connected across businesses.']],
  [['~8,000 sq ft','W82 redesign, branding, buildout and merchandising.'],['7 shops in one','Distinct product areas organized within W82.'],['Handed over','Denim & Soul concept and operating work transferred to ML Fashion.']],
  [['Beyond the shop floor','Bowery layout, fixtures, SKU management and reporting improved.'],['Plans put to work','Owners, producers and specialist resources connected.']]
 ],
 courageb: [
  [['2008','Co-founded COURAGE. b with my sister.'],['Personally funded & built','Financed the business and physically built its stores.']],
  [['~90% private label','Merchandise mix in the early business.'],['7 production locations','France, Italy, China, India, Vietnam, New York and Los Angeles.']],
  [['Business expanded','Stores opened across multiple US markets, alongside outlets.'],['Partial ownership sale','Sold a portion to ML Fashion; acquisitions and openings followed.']],
  [['Outlet channel created','A separate route for discounted inventory.'],['Comparable net margins','In my experience, close to regular stores, including rent.']]
 ],
 sharperimage: [
  [['Client → employer','Recruited from KBP after work on The Sharper Image account.'],['3 sales channels','Connected product presentation across stores, catalog and website.']],
  [['8 product examples','From air purifiers and an MP3 watch to a cooling neck band and R2-D2.'],['Supplier programs','Worked across company suppliers on products and private label.']],
  [['~$1M annually','Negotiated vendor co-op funding for the catalog.'],['Licensing developed','Helped develop the approach during my tenure; agreements not claimed.']],
  [['Products connected','Customer interest, suppliers and commercial terms considered together.'],['Offer developed','Product presentation coordinated across selling channels.']]
 ],
 kbp: [
  [['Managing partners','Worked in their new-business unit as a Junior Analyst.'],['Agency brought together','Combined departmental contributions for pitches and account growth.']],
  [['Pitch → campaign','The Priceline trophies I made became part of the actual campaign.'],['2 existing accounts','Assembled work supporting Edward Jones and Snapple expansion.']],
  [['4 team wins','Priceline, Mrs. Butterworth’s, Diageo and The Sharper Image.'],['Recruited by the client','The Sharper Image hired me from KBP.']],
  [['Made it tangible','Priceline pitch trophies carried into the campaign.'],['Next role earned','Client work led directly into product development.']]
 ]
};

export function withHighlights(markup, id, chapter, escape) {
 const items=careerHighlights[id][chapter];
 const list=`<ul class="career-highlights" aria-label="${escape(['Context','The Work','Outcome','Takeaway'][chapter])} highlights">${items.map(([lead,detail])=>`<li><strong>${escape(lead)}</strong><span>${escape(detail)}</span></li>`).join('')}</ul>`;
 return markup.replace(/<div class="chapter-media">[\s\S]*?<\/div>/,media=>`<aside class="career-evidence">${media}${list}</aside>`);
}
