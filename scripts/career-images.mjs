const h=n=>`history/img-${String(n).padStart(2,'0')}.jpg`;
const c=n=>`assets/career/${n}.webp`;
export const chapterImages={
moremargin:[[c('moremargin-work-v1')],[c('moremargin-outcome-v1')],[],[c('moremargin-context-v1'),c('moremargin-takeaway-v1')]],
funtown:[[c('funtown-context-v2')],[c('funtown-work-v2')],[c('funtown-outcome-v2')],[c('funtown-takeaway-v2')]],
bigbox:[[c('bigbox-context-v1')],[c('bigbox-work-v1')],[c('bigbox-outcome-v1')],[c('bigbox-takeaway-v1')]],
campingworld:[[h(27),h(28)],[h(29),h(30)],[h(26),h(31),h(35)],[h(32),h(33)]],
lemonis:[[h(40),h(41)],[h(39)],['assets/lemonis-bentleys.png'],[h(48)]],
courageb:[[h(54)],[h(53)],[h(57),h(58)],[h(56),h(61)]],
sharperimage:[[c('storefront')],[c('product')],[c('catalog')],['assets/career/sharperimage-3.jpg']],
kbp:[[c('advertising')],['assets/career/kbp-1.jpg'],['assets/career/kbp-2.jpg'],['assets/career/kbp-3.jpg']]
};
export const clientImages={
funtown:[[c('funtown-planning-detail-v1')],[c('funtown-flagship-detail-v1')],[c('funtown-product-detail-v1')],[c('funtown-logistics-detail-v1')]],
lemonis:[[h(45),h(46)],['assets/lemonis-sweetpetes.png',h(47)],[h(37),h(51)],[h(49)],[h(42),h(43),h(44)],[h(50),h(52)],['assets/lemonis-americantea.png'],['assets/lemonis-simplegreek.png']]
};
