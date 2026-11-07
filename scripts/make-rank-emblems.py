"""Cuts the owner's sheet of 18 rank emblems (3 rows of 6, transparent PNG) into public/ranks/rank-01..18.webp (256px) and calms the translucent face colour.

    python3 scripts/make-rank-emblems.py <sheet.png>      # needs Pillow, numpy, scipy
"""
import sys
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
im=Image.open(sys.argv[1]).convert('RGBA')
A=np.array(im);a=A[...,3]
m=a>200
m=ndi.binary_opening(m,iterations=3)
m=ndi.binary_closing(m,iterations=4)
m=ndi.binary_fill_holes(m)
lab,n=ndi.label(m)
sizes=ndi.sum(m,lab,range(1,n+1))
order=np.argsort(sizes)[::-1][:24]

objs=ndi.find_objects(lab)
items=[]
for i in order:
    sl=objs[i];items.append((i+1,sl,sizes[i]))

import os
A=A.copy()
low=(a<225)
for i,sl,sz in items:
    reg=(lab==i)&low
    if reg.sum()<50: continue
    med=np.median(A[...,:3][reg],axis=0)
    w=reg.astype(float)
    bl=np.zeros(A[...,:3].shape)
    for c in range(3):
        bl[...,c]=ndi.gaussian_filter(A[...,c]*w,14)/np.maximum(ndi.gaussian_filter(w,14),1e-3)
    for c in range(3):
        v=0.8*med[c]+0.2*bl[...,c]
        A[...,c]=np.where(reg,v,A[...,c]).astype(np.uint8)
cells=[]
for i,sl,s_ in items: cells.append((i,sl))
cells.sort(key=lambda c:(0 if c[1][0].start<200 else 1 if c[1][0].start<450 else 2, c[1][1].start))
out='public/ranks'
S=256
for k,(i,sl) in enumerate(cells,1):
    mm=ndi.binary_erosion(lab==i,iterations=1)
    al=ndi.gaussian_filter(mm.astype(float),0.8)
    al=np.clip(al*1.0,0,1)
    y0,y1,x0,x1=sl[0].start,sl[0].stop,sl[1].start,sl[1].stop
    p=8
    rgb=A[y0-p:y1+p,x0-p:x1+p,:3]
    alc=(al[y0-p:y1+p,x0-p:x1+p]*255).astype(np.uint8)
    tile=Image.fromarray(np.dstack([rgb,alc]),'RGBA')
    w,h=tile.size;sc=(S-16)/max(w,h)
    tile=tile.resize((round(w*sc),round(h*sc)),Image.LANCZOS)
    can=Image.new('RGBA',(S,S),(0,0,0,0));can.paste(tile,((S-tile.width)//2,(S-tile.height)//2))
    can.save(f'{out}/rank-{k:02d}.webp',quality=92,method=6)
for k in range(18):
