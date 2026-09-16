import fs from 'node:fs';
import {createHash} from 'node:crypto';
export function editorial(html,d,e,img){
 const reasons=[
 ['A sourcing capability the business owns','Factory relationships became an owned sourcing and direct-selling capability, connecting the product decision with the route to market.'],
 ['A network that could respond','The PPE work put established global relationships to use during a period when access and delivery mattered.'],
 ['A large footprint made ready to trade','Space planning, procurement and merchandising had to converge at store level for the opening to work.'],
 ['An assortment with its own identity','Owned brands gave the business control over the product, positioning and channels, bringing sourcing and retail execution into one program.'],
 ['A more repeatable way to open stores','Standardizing the opening model lowered unit cost while supporting expansion through both acquisitions and new builds.'],
 ['An owned offer, with owned economics','Product development, production and the retail floor worked together in a business my sister and I built.'],
 ['A different route to margin','Factory-direct sourcing changed the economics of products the customer was already buying, with two house brands connecting the supply decision to the shelf.'],
 ['Acquisitions turned into an operating business','The work was to connect banners, stores, merchandising and teams into a format that could operate under one name.']
 ];
 const roles=['moremargin','bigbox','campingworld','campingworld','lemonis','courageb','funtown','campingworld'];
 const result=`<section class="results-section shell" id="value"><div class="section-heading"><span class="eyebrow">What the work changed</span><h2>Different businesses.<br>The same attention to execution.</h2><p>The numbers sit at the end of a chain of decisions. These are the changes behind them—and the experience I would bring to the next organization.</p></div><div class="outcome-stories">${d.highlightsData.map((h,i)=>`<article class="outcome-story"><div><span class="eyebrow">${e(d.rolesData.find(r=>r.id===roles[i]).company)}</span><h3>${reasons[i][0]}</h3><p>${reasons[i][1]}</p><a class="outcome-link" href="#role-${roles[i]}">Read the work behind it ↗</a></div><div class="outcome-evidence"><strong>${e(h.num)} <small>${e(h.unit)}</small></strong><p>${e(h.desc)}</p></div></article>`).join('')}</div></section>`;
 html=html.replace(/<section class="results-section shell"[\s\S]*?(?=<section class="brand-story")/,result+'\n');
 const bg={about:'about-biography',opportunity:'opportunity',experience:'experience',build:'build',value:'value','product-journey':'product',ai:'systems',contact:'contact'};
 for(const [id,name] of Object.entries(bg)){
  html=html.replace(new RegExp(`(<section[^>]*id="${id}"[^>]*>)`),`$1<div class="section-art" aria-hidden="true"><img src="illustrations/${id==='experience'?'My-journey':name+(['about','opportunity'].includes(id)?'-v4':'-v3')}.webp" alt="" loading="lazy" data-parallax="0.16"></div>`);
 }

 // Keep each photograph in one editorial position; full-size links remain available.
 const used=new Set();
 html=html.replace(/<img\b[^>]*>/g,tag=>{const src=tag.match(/src="([^"]+)"/)?.[1];if(!src||/tool-logos/.test(src))return tag;const key=fs.existsSync('docs/'+src)?createHash('sha256').update(fs.readFileSync('docs/'+src)).digest('hex'):src;if(used.has(key))return '';used.add(key);return tag.replace('<img ', '<img title="'+(tag.match(/alt="([^"]*)"/)?.[1]||'')+'" ');});
 html=html.replace(/<figure>\s*(?:<a\b[^>]*>\s*<\/a>)?\s*<\/figure>/g,'');
 return html;
}
