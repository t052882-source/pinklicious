import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
from scipy import ndimage
U='/root/.claude/uploads/a385db7e-72c7-5734-8e24-bb37e3e4d26f/'
rng=np.random.default_rng(21)

def cut(src, out, warm=1.0, rose=1.0, sat=1.05, contrast=1.04, grain=3.0, soften=0, thr=10, erode=1):
    im = Image.open(U+src).convert('RGB')
    if soften: im = im.filter(ImageFilter.MedianFilter(soften))
    a = np.asarray(im).astype(np.float32)
    d = 255 - a.min(axis=2)                     # distance from white
    m = d > 12
    m = ndimage.binary_closing(m, np.ones((5,5)))
    lab,n = ndimage.label(m)
    sz = ndimage.sum(m, lab, range(1,n+1))
    m = lab == (np.argmax(sz)+1)
    m = ndimage.binary_fill_holes(m)
    m = ndimage.binary_closing(m, np.ones((9,9)))
    m = ndimage.binary_fill_holes(m)
    # pull the matte in so no white halo from the studio background survives
    core = ndimage.binary_erosion(m, np.ones((3,3)), iterations=erode)
    alpha = np.minimum(np.clip((d-thr)/14.0, 0, 1), core.astype(np.float32))

    # grade to the house look
    c = a/255.
    c[:,:,0] = c[:,:,0]*(1+0.035*warm)+0.008*rose
    c[:,:,1] = c[:,:,1]*(1+0.004*warm)+0.002
    c[:,:,2] = c[:,:,2]*(1-0.004*warm)+0.012*rose
    c = np.clip((np.clip(c,0,1)-0.5)*contrast+0.5, 0, 1)
    g = ImageEnhance.Color(Image.fromarray((c*255).astype(np.uint8))).enhance(sat)
    c = np.asarray(g).astype(np.float32)
    c = np.clip(c + rng.normal(0, grain, c.shape[:2])[:,:,None], 0, 255)

    rgba = Image.fromarray(c.astype(np.uint8)).convert('RGBA')
    rgba.putalpha(Image.fromarray((alpha*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.9)))
    ys,xs = np.nonzero(alpha > 0.35)
    pad = 8
    rgba = rgba.crop((max(0,xs.min()-pad), max(0,ys.min()-pad),
                      min(rgba.width,xs.max()+pad), min(rgba.height,ys.max()+pad)))
    side = max(rgba.size)
    sq = Image.new('RGBA',(side,side),(0,0,0,0))
    sq.alpha_composite(rgba, ((side-rgba.width)//2,(side-rgba.height)//2))

    # soft contact shadow so it sits on the pink disc
    sh = Image.new('L',(side,side),0)
    sh.paste(sq.getchannel('A'), (int(side*0.012), int(side*0.028)))
    sh = sh.filter(ImageFilter.GaussianBlur(side*0.028)).point(lambda v: int(v*0.42))
    base = Image.new('RGBA',(side,side),(128,74,96,0)); base.putalpha(sh)
    base.alpha_composite(sq)
    base = base.resize((820,820), Image.LANCZOS)
    base.save(out, quality=92, method=6)
    print(out, base.size)

cut('c1d26bbd-image.jpg', 'img/cookie-choco-coco.webp',   warm=1.0, rose=1.1, sat=1.06, contrast=1.05, grain=3.2, thr=14, erode=2)
cut('63f42d3e-image.jpg', 'img/cookie-chocolate-chip.webp', warm=1.0, rose=1.05, sat=1.04, contrast=1.03, grain=2.6, soften=3, thr=34, erode=3)
