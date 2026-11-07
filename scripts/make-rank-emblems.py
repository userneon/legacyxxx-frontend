"""Cuts the owner's sheet of 18 hollow rank emblems (3 rows of 6, transparent PNG with a noisy halo) into public/ranks/rank-01..18.webp (256px): keeps the solid body, drops the halo.

    python3 scripts/make-rank-emblems.py <sheet.png>      # needs Pillow, numpy, scipy
"""
import sys
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
im=Image.open(sys.argv[1]).convert('RGBA')
A=np.array(im);a=A[...,3].astype(float)

core=a>=190
core=ndi.binary_opening(core,iterations=1)
lab,n=ndi.label(ndi.binary_closing(core,iterations=3))
sizes=ndi.sum(core,lab,range(1,n+1))
order=np.argsort(sizes)[::-1][:18]

objs=ndi.find_objects(lab)
cells=[(i+1,objs[i]) for i in order]
cells.sort(key=lambda c:(0 if c[1][0].start<280 else 1 if c[1][0].start<560 else 2, c[1][1].start))
al=np.clip((a-170)/70,0,1)
S=256;out='public/ranks'
for k,(i,sl) in enumerate(cells,1):
    reg=ndi.binary_dilation(lab==i,iterations=6)  # keep only near this emblem's body
    # also keep inner parts (stars) that are separate comps: use bounding box region of the emblem's hull
    y0,y1,x0,x1=sl[0].start-4,sl[0].stop+4,sl[1].start-4,sl[1].stop+4
    box=np.zeros(a.shape,bool);box[y0:y1,x0:x1]=True
    m=al*(box)
    # drop specks: components of core inside the box smaller than 60px
    c2=(m>0.5)
    l2,n2=ndi.label(c2);sz=ndi.sum(c2,l2,range(1,n2+1))
    keep=np.isin(l2,[j+1 for j,s in enumerate(sz) if s>=60])
    keep=ndi.binary_dilation(keep,iterations=2)
    m=m*keep
    rgb=A[y0:y1,x0:x1,:3];alc=(m[y0:y1,x0:x1]*255).astype(np.uint8)
    t=Image.fromarray(np.dstack([rgb,alc]),'RGBA');w,h=t.size;sc=(S-16)/max(w,h)
    t=t.resize((round(w*sc),round(h*sc)),Image.LANCZOS)
    can=Image.new('RGBA',(S,S),(0,0,0,0));can.paste(t,((S-t.width)//2,(S-t.height)//2))
    can.save(f'{out}/rank-{k:02d}.webp',quality=92,method=6)
