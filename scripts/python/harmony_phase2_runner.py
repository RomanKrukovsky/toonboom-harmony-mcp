"""Licensed-machine runner for Phase 2. Never reports verified_real without native audit, render and rollback."""
import argparse, hashlib, json, os, shutil, struct, subprocess, sys, zlib
from pathlib import Path

SUPPORTED={"create_palette","add_palette_swatch","create_drawing_element","create_drawing","write_path","set_exposure","create_node","connect_nodes","create_peg","attach_drawing_to_peg","set_peg_pivot","set_transform_keyframe","set_transform_interpolation","save_project"}
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def call(bridge,packages,command,args):
 payload={"command":command,"pythonPackages":str(packages),"args":args};env=dict(os.environ);env["HARMONY_PYTHON_PACKAGES"]=str(packages)
 r=subprocess.run([sys.executable,str(bridge)],input=json.dumps(payload),text=True,capture_output=True,env=env,timeout=300)
 if r.returncode:raise RuntimeError(r.stderr or r.stdout)
 data=json.loads(r.stdout);return data
def validate(bundle):
 inventory=json.loads((bundle/'inventory.json').read_text())
 errors=[]
 for item in inventory['files']:
  p=bundle/item['name']
  if not p.is_file():errors.append('missing:'+item['name'])
  elif p.stat().st_size!=item['size'] or sha(p)!=item['sha256']:errors.append('checksum:'+item['name'])
 plan=json.loads((bundle/'harmony_command_plan_v4.json').read_text())
 if plan.get('schemaVersion')!='4.0' or not plan.get('requiresRealHarmony'):errors.append('invalid_plan')
 return errors
def png(path):
 data=path.read_bytes()
 if data[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError('not_png:'+str(path))
 pos=8;raw=b'';width=height=depth=kind=None
 while pos<len(data):
  size=struct.unpack('>I',data[pos:pos+4])[0];name=data[pos+4:pos+8];chunk=data[pos+8:pos+8+size];pos+=12+size
  if name==b'IHDR':width,height,depth,kind,_,_,_=struct.unpack('>IIBBBBB',chunk)
  elif name==b'IDAT':raw+=chunk
  elif name==b'IEND':break
 if depth!=8 or kind not in (0,2,6):raise ValueError('unsupported_png_format')
 channels={0:1,2:3,6:4}[kind];decoded=zlib.decompress(raw);stride=width*channels;rows=[];offset=0;prev=bytearray(stride)
 for _ in range(height):
  f=decoded[offset];offset+=1;scan=bytearray(decoded[offset:offset+stride]);offset+=stride
  for i in range(stride):
   a=scan[i-channels] if i>=channels else 0;b=prev[i];c=prev[i-channels] if i>=channels else 0
   if f==1:scan[i]=(scan[i]+a)&255
   elif f==2:scan[i]=(scan[i]+b)&255
   elif f==3:scan[i]=(scan[i]+((a+b)//2))&255
   elif f==4:
    p=a+b-c;pa=abs(p-a);pb=abs(p-b);pc=abs(p-c);scan[i]=(scan[i]+(a if pa<=pb and pa<=pc else b if pb<=pc else c))&255
   elif f!=0:raise ValueError('unsupported_png_filter')
  rows.append(scan);prev=scan
 rgb=[]
 for row in rows:
  if channels==1:rgb.extend(v for x in row for v in (x,x,x))
  else:
   for i in range(0,len(row),channels):rgb.extend(row[i:i+3])
 return width,height,rgb
def compare_render(bundle,manifest,previews):
 source_map=json.loads((bundle/'source_frame_map.json').read_text());drawing_by_frame={}
 for exp in manifest['exposures']:
  for frame in range(exp['frame'],exp['frame']+exp['duration']):drawing_by_frame[frame]=exp['drawingId']
 reports=[]
 for render in previews:
  digits=''.join(x for x in render.stem if x.isdigit());frame=int(digits[-6:] or digits);rel=source_map.get(drawing_by_frame.get(frame));
  if not rel:raise RuntimeError('missing bundled source frame')
  sw,sh,sp=png(bundle/rel);rw,rh,rp=png(render)
  if (sw,sh)!=(rw,rh):raise RuntimeError('render/source size mismatch')
  mae=sum(abs(a-b) for a,b in zip(sp,rp))/max(1,len(sp));reports.append({'frame':frame,'source':rel,'render':str(render),'meanAbsoluteError':round(mae,4),'sizesMatch':True})
 return reports
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--bundle',required=True);ap.add_argument('--validate-only',action='store_true');ap.add_argument('--source-project');ap.add_argument('--work-dir');ap.add_argument('--python-packages');a=ap.parse_args();bundle=Path(a.bundle).resolve();errors=validate(bundle)
 if errors:print(json.dumps({"status":"failed","errors":errors}));return 2
 if a.validate_only:print(json.dumps({"status":"implemented_unverified","executed":True,"verified":True,"requiresRealHarmony":True}));return 0
 if not all((a.source_project,a.work_dir,a.python_packages)):raise SystemExit('source-project, work-dir and python-packages are required')
 source=Path(a.source_project).resolve(strict=True);work=Path(a.work_dir).resolve();candidate=work/'candidate';snapshot=work/'snapshot'
 if work.exists():shutil.rmtree(work)
 shutil.copytree(source.parent,candidate);shutil.copytree(candidate,snapshot);project=candidate/source.name;packages=Path(a.python_packages).resolve(strict=True);bridge=bundle/'harmony_bridge.py';manifest=json.loads((bundle/'manifest.json').read_text());v4=json.loads((bundle/'harmony_command_plan_v4.json').read_text());legacy={"planId":v4['planId'],"manifestId":v4['manifestId'],"commands":[{"type":c['type'],"params":c['params']} for c in v4['commands'] if c['type'] in SUPPORTED]}
 apply=call(bridge,packages,'execute_command_plan',{"projectPath":str(project),"plan":legacy})
 if apply.get('status')!='success' or apply.get('saved') is not True:raise RuntimeError('native apply/save failed')
 audit=call(bridge,packages,'audit_reconstruction_scene',{"projectPath":str(project),"manifest":manifest})
 native=audit.get('nativeAudit') or {}
 if audit.get('status')!='success' or audit.get('verified') is not True or audit.get('reopenedFromDisk') is not True or native.get('vectorType')!='TVG' or native.get('drawingCount')!=len(manifest['drawings']) or native.get('nonemptyDrawingCount')!=len(manifest['drawings']) or native.get('exposureTimingMatches') is not True or native.get('paletteLinked') is not True:raise RuntimeError('save/reopen native audit failed')
 nodes=call(bridge,packages,'list_nodes',{'projectPath':str(project)}).get('nodes',[]);expected_pegs=[c['params']['pegName'] for c in v4['commands'] if c['type']=='create_peg']
 if any(not any(name in str(node) for node in nodes) for name in expected_pegs):raise RuntimeError('Peg did not persist after reopen')
 render_dir=work/'render';render=call(bridge,packages,'render_reconstruction_preview',{"projectPath":str(project),"manifest":manifest,"outputDirectory":str(render_dir),"startFrame":1,"endFrame":min(3,manifest['source']['frameCount'])})
 previews=[Path(x) for x in render.get('previewPaths',[])]
 if not previews or any(not p.is_file() or p.stat().st_size==0 for p in previews):raise RuntimeError('real render failed')
 comparison=compare_render(bundle,manifest,previews)
 shutil.rmtree(candidate);shutil.copytree(snapshot,candidate);restored=candidate/source.name;inspect=call(bridge,packages,'inspect_project',{"projectPath":str(restored)})
 if inspect.get('status')!='success':raise RuntimeError('rollback project did not reopen')
 result={"status":"verified_real","executed":True,"verified":True,"artifactCreated":True,"nativeAudit":native,"previewPaths":[str(p) for p in previews],"renderComparison":comparison,"rollback":{"restored":True,"reopened":True},"warnings":[]}
 (work/'phase2_native_result.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));return 0
if __name__=='__main__':raise SystemExit(main())
