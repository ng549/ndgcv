from pathlib import Path
import json,subprocess
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak,KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont("CVSans","/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("CVSans-Bold","/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))
pdfmetrics.registerFontFamily("CVSans",normal="CVSans",bold="CVSans-Bold",italic="CVSans",boldItalic="CVSans-Bold")
from reportlab.lib.pagesizes import letter
root=Path(__file__).resolve().parent.parent
roles=json.loads((root/'docs/content.json').read_text())['rolesData']
highlights=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {careerHighlights} from './scripts/career-highlights.mjs'; console.log(JSON.stringify(careerHighlights))"],cwd=root))
navy=HexColor('#193440');amber=HexColor('#99652f')
styles={
'name':ParagraphStyle('Name',fontName='CVSans-Bold',fontSize=29,leading=33,textColor=navy,spaceAfter=8),
'descriptor':ParagraphStyle('Descriptor',fontName='CVSans-Bold',fontSize=12,leading=16,textColor=navy,spaceAfter=8),
'body':ParagraphStyle('Body',fontName='CVSans',fontSize=10,leading=14,textColor=navy,spaceAfter=8),
'section':ParagraphStyle('Section',fontName='CVSans-Bold',fontSize=11,leading=15,textColor=amber,spaceBefore=9,spaceAfter=9),
'company':ParagraphStyle('Company',fontName='CVSans-Bold',fontSize=12,leading=15,textColor=navy,spaceAfter=3),
'meta':ParagraphStyle('Meta',fontName='CVSans',fontSize=9,leading=12,textColor=HexColor('#4e6269'),spaceAfter=6),
'bullet':ParagraphStyle('Bullet',fontName='CVSans',fontSize=9.5,leading=12.5,textColor=navy,leftIndent=10,firstLineIndent=-10,spaceAfter=5)
}
def clean(s):return escape(s.replace('–','-').replace('—',' - ').replace('’',"'").replace('→','to').replace('~','approximately '))
def p(s,style='body'):return Paragraph(s,styles[style])
def role(r):
 parts=[p(clean(r['company']),'company'),p(clean(r['role'])+'<br/>'+clean(r['years'])+' | '+clean(r['location']),'meta')]
 pairs=highlights[r['id']]
 selected=[pairs[1][0],pairs[2][0]]
 if r['id']=='moremargin':selected=[pairs[0][0],pairs[2][0]]
 if r['id']=='bigbox':selected=[pairs[0][1],pairs[2][0]]
 for title,detail in selected:parts.append(p('- <b>'+clean(title)+'.</b> '+clean(detail),'bullet'))
 if r['id']=='courageb':parts.append(p('Founded and operated alongside full-time executive roles.','meta'))
 parts.append(Spacer(1,5));return KeepTogether(parts)
def footer(c,doc):
 c.setStrokeColor(HexColor('#c7c9c3'));c.line(44,42,568,42);c.setFont('CVSans',8);c.setFillColor(navy);c.drawString(44,28,'Nicolas Goureau | nicolasgoureau.com');c.drawRightString(568,28,str(doc.page))
story=[p('Nicolas Goureau','name'),p('BUSINESS BUILDING &amp; OPERATIONS','descriptor'),p('Atlanta, GA | <link href="mailto:ngoureau@mac.com" color="#193440">ngoureau@mac.com</link> | <link href="https://nicolasgoureau.com" color="#193440">nicolasgoureau.com</link>','meta'),p('I help owners and leadership teams turn new business concepts into working operations. My experience spans founding a company, developing products, launching stores and integrating acquisitions. I connect creative thinking with sourcing, margin discipline, practical systems and the people responsible for delivery.'),p('EXPERIENCE','section')]
story += [role(r) for r in roles[:4]]
story += [PageBreak(),p('Nicolas Goureau','company'),p('EXPERIENCE, CONTINUED','section')]
story += [role(r) for r in roles[4:]]
story += [p('EDUCATION','section'),p('<b>University of Miami</b> | 2006<br/>B.S.C. Advertising; B.B.A. Economics; B.A. Theatre Arts.<br/><b>The American University of Paris</b> | Summer 2002<br/>Accelerated summer business management program.'),p('CAPABILITIES &amp; LANGUAGES','section'),p('Business development; product and private-label development; global sourcing; store planning and merchandising; acquisition integration; e-commerce and operational systems.<br/>English and French: fluent. Hebrew: conversational. Spanish: basic.'),p('<link href="https://nicolasgoureau.com" color="#99652f">Explore the complete Interactive CV for project examples and the work behind these results.</link>','meta')]
doc=SimpleDocTemplate(str(root/'docs/Nicolas-Goureau-CV.pdf'),pagesize=letter,rightMargin=44,leftMargin=44,topMargin=40,bottomMargin=56,title='Nicolas Goureau - CV',author='Nicolas Goureau')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
