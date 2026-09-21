"""Generate the single future-CV QR. Requires qrcode and opencv-python-headless.
Digital sampling verifies decoding at 25 mm / 300 dpi; physical phone scanning
and the live /connect destination still require verification after publication.
"""
from pathlib import Path
import json
import qrcode
import qrcode.image.svg
import cv2
out=Path('design/connect');out.mkdir(parents=True,exist_ok=True)
url='https://nicolasgoureau.com/connect'
qr=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_Q,box_size=12,border=4)
qr.add_data(url);qr.make(fit=True)
qr.make_image(fill_color='black',back_color='white').save(out/'connect-qr.png')
qr.make_image(image_factory=qrcode.image.svg.SvgPathFillImage).save(out/'connect-qr.svg')
original=cv2.imread(str(out/'connect-qr.png'))
checks=[]
for mm in [25,30]:
 pixels=round(mm/25.4*300)
 image=cv2.resize(original,(pixels,pixels),interpolation=cv2.INTER_AREA)
 decoded,points,_=cv2.QRCodeDetector().detectAndDecode(image)
 assert decoded==url,(mm,decoded)
 checks.append({'size_mm':mm,'dpi':300,'pixels':pixels,'decoded':decoded})
(out/'qr-verification.json').write_text(json.dumps({'destination':url,'quiet_zone_modules':4,'error_correction':'Q','checks':checks,'physical_phone_scan':'pending','live_destination':'pending deployment','label':'Explore my work & connect.'},indent=2)+'\n')
print('QR decoded correctly at digital samples representing 25 and 30 mm at 300 dpi. Physical scanning and live destination pending.')
