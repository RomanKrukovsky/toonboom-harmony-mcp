import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { config } from '../../config.js';
import { HarmonyError, verifyPathAccess } from '../../security.js';

export type FactoryRole='viewer'|'artist'|'director'|'pipeline_admin'|'system_admin';
const rank:Record<FactoryRole,number>={viewer:0,artist:1,director:2,pipeline_admin:3,system_admin:4};
export interface Principal { id:string; role:FactoryRole; authMode:'token'|'local_degraded'; }

export class FactoryAuth {
  authorize(token:string|undefined,minimum:FactoryRole):Principal {
    const configured=process.env.HARMONY_FACTORY_TOKENS;
    if(!configured){const p:Principal={id:'local-dev',role:'pipeline_admin',authMode:'local_degraded'};if(rank[p.role]<rank[minimum])throw new HarmonyError('CONTROL_CENTER_AUTH_FAILED','Недостаточно прав.');return p;}
    let tokens:Record<string,{id:string;role:FactoryRole}>;try{tokens=JSON.parse(configured);}catch{throw new HarmonyError('CONTROL_CENTER_AUTH_FAILED','HARMONY_FACTORY_TOKENS содержит неверный JSON.');}
    const entry=token&&tokens[token];if(!entry||rank[entry.role]<rank[minimum])throw new HarmonyError('CONTROL_CENTER_AUTH_FAILED','Неверный token или недостаточно прав.');return{id:entry.id,role:entry.role,authMode:'token'};
  }
}

export class FactoryFoundationStore {
  readonly root:string; private db:sqlite3.Database;
  constructor(root=path.join(config.allowedRoots[0],'output','factory')){this.root=verifyPathAccess(root);fs.mkdirSync(this.root,{recursive:true});this.db=new sqlite3.Database(path.join(this.root,'factory.db'));}
  async initialize(){await this.exec(`CREATE TABLE IF NOT EXISTS factory_jobs(id TEXT PRIMARY KEY,type TEXT,status TEXT,progress REAL,input_json TEXT,result_json TEXT,error_json TEXT,created_at TEXT,updated_at TEXT,cancel_requested INTEGER DEFAULT 0);CREATE TABLE IF NOT EXISTS factory_steps(id TEXT PRIMARY KEY,job_id TEXT,name TEXT,status TEXT,attempt INTEGER DEFAULT 0,depends_on TEXT,checkpoint_json TEXT,updated_at TEXT);CREATE TABLE IF NOT EXISTS factory_registry(id TEXT PRIMARY KEY,kind TEXT,name TEXT,revision TEXT,checksum TEXT,status TEXT,metadata_json TEXT,created_at TEXT);CREATE TABLE IF NOT EXISTS factory_artifacts(id TEXT PRIMARY KEY,sha256 TEXT UNIQUE,size INTEGER,media_type TEXT,source_path TEXT,stored_path TEXT,created_at TEXT);CREATE TABLE IF NOT EXISTS factory_metrics(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,value REAL,labels_json TEXT,created_at TEXT);`);}
  async createJob(type:string,input:any,steps:string[]){await this.initialize();const id=`job_${crypto.randomUUID()}`,now=new Date().toISOString();await this.run('INSERT INTO factory_jobs VALUES(?,?,?,?,?,?,?,?,?,0)',[id,type,'queued',0,JSON.stringify(input),null,null,now,now]);for(let i=0;i<steps.length;i++)await this.run('INSERT INTO factory_steps VALUES(?,?,?,?,?,?,?,?)',[`${id}_${i+1}`,id,steps[i],'pending',0,i?steps[i-1]:null,null,now]);return this.getJob(id);}
  async setJob(id:string,status:string,progress:number,result?:any,error?:any){await this.run('UPDATE factory_jobs SET status=?,progress=?,result_json=?,error_json=?,updated_at=? WHERE id=?',[status,progress,result?JSON.stringify(result):null,error?JSON.stringify(error):null,new Date().toISOString(),id]);}
  async setStep(jobId:string,name:string,status:string,checkpoint?:any){await this.run('UPDATE factory_steps SET status=?,attempt=attempt+1,checkpoint_json=?,updated_at=? WHERE job_id=? AND name=?',[status,checkpoint?JSON.stringify(checkpoint):null,new Date().toISOString(),jobId,name]);}
  async getJob(id:string){const job:any=await this.get('SELECT * FROM factory_jobs WHERE id=?',[id]);if(!job)throw new HarmonyError('JOB_NOT_FOUND',`Factory job ${id} не найден.`);const steps:any[]=await this.all('SELECT * FROM factory_steps WHERE job_id=? ORDER BY rowid',[id]);return{jobId:job.id,type:job.type,status:job.status,progress:job.progress,input:parse(job.input_json),result:parse(job.result_json),error:parse(job.error_json),cancelRequested:Boolean(job.cancel_requested),steps:steps.map(s=>({name:s.name,status:s.status,attempt:s.attempt,dependsOn:s.depends_on,checkpoint:parse(s.checkpoint_json)})),createdAt:job.created_at,updatedAt:job.updated_at};}
  async cancel(id:string){await this.run("UPDATE factory_jobs SET cancel_requested=1,status=CASE WHEN status IN ('completed','failed') THEN status ELSE 'cancelled' END,updated_at=? WHERE id=?",[new Date().toISOString(),id]);return this.getJob(id);}
  async register(kind:string,name:string,revision:string,checksum:string,status:string,metadata:any){await this.initialize();const id=`${kind}_${crypto.createHash('sha256').update(`${name}:${revision}`).digest('hex').slice(0,16)}`;await this.run('INSERT OR REPLACE INTO factory_registry VALUES(?,?,?,?,?,?,?,?)',[id,kind,name,revision,checksum,status,JSON.stringify(metadata),new Date().toISOString()]);return{id,kind,name,revision,checksum,status,metadata};}
  async listRegistry(kind?:string){await this.initialize();const rows:any[]=kind?await this.all('SELECT * FROM factory_registry WHERE kind=?',[kind]):await this.all('SELECT * FROM factory_registry',[]);return rows.map(r=>({...r,metadata:parse(r.metadata_json)}));}
  async ingest(source:string,mediaType='application/octet-stream'){await this.initialize();const real=verifyPathAccess(source);if(!fs.statSync(real).isFile())throw new Error('Artifact source is not a file');const sha=await hashFile(real),dir=path.join(this.root,'objects',sha.slice(0,2)),stored=path.join(dir,sha);fs.mkdirSync(dir,{recursive:true});if(!fs.existsSync(stored))fs.copyFileSync(real,stored);const size=fs.statSync(stored).size,id=`artifact_${sha.slice(0,20)}`;await this.run('INSERT OR IGNORE INTO factory_artifacts VALUES(?,?,?,?,?,?,?)',[id,sha,size,mediaType,real,stored,new Date().toISOString()]);return{id,sha256:sha,size,mediaType,sourcePath:real,storedPath:stored,verified:fs.statSync(stored).size===size};}
  async metric(name:string,value:number,labels:any={}){await this.initialize();await this.run('INSERT INTO factory_metrics(name,value,labels_json,created_at) VALUES(?,?,?,?)',[name,value,JSON.stringify(labels),new Date().toISOString()]);}
  private exec(sql:string){return new Promise<void>((ok,bad)=>this.db.exec(sql,e=>e?bad(e):ok()));} private run(sql:string,p:any[]){return new Promise<void>((ok,bad)=>this.db.run(sql,p,e=>e?bad(e):ok()));} private get(sql:string,p:any[]){return new Promise<any>((ok,bad)=>this.db.get(sql,p,(e,r)=>e?bad(e):ok(r)));} private all(sql:string,p:any[]){return new Promise<any[]>((ok,bad)=>this.db.all(sql,p,(e,r)=>e?bad(e):ok(r)));}
}
function parse(v:any){if(!v)return null;try{return JSON.parse(v);}catch{return v;}} async function hashFile(file:string){const h=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))h.update(chunk as Buffer);return h.digest('hex');}
