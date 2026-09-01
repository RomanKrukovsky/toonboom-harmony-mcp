import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { config } from '../../config.js';
import { HarmonyError, verifyPathAccess } from '../../security.js';
import type { MohoProductionV3Gate, MohoProductionV3Stage } from '../../schemas/mohoProductionV3.js';

export type FactoryRole='viewer'|'artist'|'director'|'pipeline_admin'|'system_admin';
const rank:Record<FactoryRole,number>={viewer:0,artist:1,director:2,pipeline_admin:3,system_admin:4};
export interface Principal { id:string; role:FactoryRole; authMode:'token'|'local_degraded'; }

export interface FactoryStageArtifact {
  stageArtifactId: string;
  jobId: string;
  stage: string;
  artifactId: string;
  sha256: string;
  sourcePath: string;
  storedPath: string;
  provenance: Record<string, unknown>;
  valid: boolean;
  createdAt: string;
}

export interface FactoryApproval {
  approvalId: string;
  jobId: string;
  gate: string;
  stage: string;
  status: 'pending' | 'approved' | 'rejected' | 'invalidated';
  artifactIds: string[];
  decision: Record<string, unknown> | null;
  requestedAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  retakeIndex: number;
  invalidatedReason: string | null;
}

export interface FactoryModelCallInput {
  jobId: string;
  stage: MohoProductionV3Stage;
  provider: string;
  model: string;
  requestSha256: string;
  responseSha256?: string;
  status: 'running' | 'completed' | 'failed';
  metadata?: Record<string, unknown>;
}

export class FactoryAuth {
  authorize(token:string|undefined,minimum:FactoryRole):Principal {
    const configured=process.env.HARMONY_FACTORY_TOKENS;
    if(!configured){const p:Principal={id:'local-dev',role:'pipeline_admin',authMode:'local_degraded'};if(rank[p.role]<rank[minimum])throw new HarmonyError('CONTROL_CENTER_AUTH_FAILED','Недостаточно прав.');return p;}
    let tokens:Record<string,{id:string;role:FactoryRole}>;try{tokens=JSON.parse(configured);}catch{throw new HarmonyError('CONTROL_CENTER_AUTH_FAILED','HARMONY_FACTORY_TOKENS содержит неверный JSON.');}
    const entry=token&&tokens[token];if(!entry||rank[entry.role]<rank[minimum])throw new HarmonyError('CONTROL_CENTER_AUTH_FAILED','Неверный token или недостаточно прав.');return{id:entry.id,role:entry.role,authMode:'token'};
  }
}

export class FactoryFoundationStore {
  readonly root:string; private db:sqlite3.Database; private initializePromise:Promise<void>|null=null;
  constructor(root=path.join(config.allowedRoots[0],'output','factory')){this.root=verifyPathAccess(root);fs.mkdirSync(this.root,{recursive:true});this.db=new sqlite3.Database(path.join(this.root,'factory.db'));}
  async initialize(){
    if(!this.initializePromise)this.initializePromise=this.initializeInternal();
    return this.initializePromise;
  }
  private async initializeInternal(){
    await this.exec(`CREATE TABLE IF NOT EXISTS factory_jobs(id TEXT PRIMARY KEY,type TEXT,status TEXT,progress REAL,input_json TEXT,result_json TEXT,error_json TEXT,created_at TEXT,updated_at TEXT,cancel_requested INTEGER DEFAULT 0);CREATE TABLE IF NOT EXISTS factory_steps(id TEXT PRIMARY KEY,job_id TEXT,name TEXT,status TEXT,attempt INTEGER DEFAULT 0,depends_on TEXT,checkpoint_json TEXT,updated_at TEXT);CREATE TABLE IF NOT EXISTS factory_registry(id TEXT PRIMARY KEY,kind TEXT,name TEXT,revision TEXT,checksum TEXT,status TEXT,metadata_json TEXT,created_at TEXT);CREATE TABLE IF NOT EXISTS factory_artifacts(id TEXT PRIMARY KEY,sha256 TEXT UNIQUE,size INTEGER,media_type TEXT,source_path TEXT,stored_path TEXT,created_at TEXT);CREATE TABLE IF NOT EXISTS factory_metrics(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,value REAL,labels_json TEXT,created_at TEXT);`);
    const current=Number((await this.get('PRAGMA user_version',[]))?.user_version??0);
    if(current>=3)return;
    await this.exec('BEGIN IMMEDIATE TRANSACTION');
    try{
      await this.exec(`CREATE TABLE IF NOT EXISTS factory_approvals(id TEXT PRIMARY KEY,job_id TEXT NOT NULL,gate TEXT NOT NULL,stage TEXT NOT NULL,status TEXT NOT NULL,artifact_ids_json TEXT NOT NULL,decision_json TEXT,requested_at TEXT NOT NULL,decided_at TEXT,decided_by TEXT,retake_index INTEGER NOT NULL DEFAULT 0,invalidated_reason TEXT);CREATE INDEX IF NOT EXISTS idx_factory_approvals_job ON factory_approvals(job_id);CREATE TABLE IF NOT EXISTS factory_stage_artifacts(id TEXT PRIMARY KEY,job_id TEXT NOT NULL,stage TEXT NOT NULL,artifact_id TEXT NOT NULL,sha256 TEXT NOT NULL,provenance_json TEXT NOT NULL,valid INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);CREATE INDEX IF NOT EXISTS idx_factory_stage_artifacts_job_stage ON factory_stage_artifacts(job_id,stage);CREATE TABLE IF NOT EXISTS factory_model_calls(id TEXT PRIMARY KEY,job_id TEXT NOT NULL,stage TEXT NOT NULL,provider TEXT NOT NULL,model TEXT NOT NULL,request_sha256 TEXT NOT NULL,response_sha256 TEXT,status TEXT NOT NULL,metadata_json TEXT NOT NULL,created_at TEXT NOT NULL);CREATE INDEX IF NOT EXISTS idx_factory_model_calls_job ON factory_model_calls(job_id);PRAGMA user_version = 3;`);
      await this.exec('COMMIT');
    }catch(error){await this.exec('ROLLBACK');throw error;}
  }
  async createJob(type:string,input:any,steps:string[]){await this.initialize();const id=`job_${crypto.randomUUID()}`,now=new Date().toISOString();await this.run('INSERT INTO factory_jobs VALUES(?,?,?,?,?,?,?,?,?,0)',[id,type,'queued',0,JSON.stringify(input),null,null,now,now]);for(let i=0;i<steps.length;i++)await this.run('INSERT INTO factory_steps VALUES(?,?,?,?,?,?,?,?)',[`${id}_${i+1}`,id,steps[i],'pending',0,i?steps[i-1]:null,null,now]);return this.getJob(id);}
  async setJob(id:string,status:string,progress:number,result?:any,error?:any){await this.initialize();await this.run('UPDATE factory_jobs SET status=?,progress=?,result_json=?,error_json=?,updated_at=? WHERE id=?',[status,progress,result?JSON.stringify(result):null,error?JSON.stringify(error):null,new Date().toISOString(),id]);}
  async setStep(jobId:string,name:string,status:string,checkpoint?:any){await this.initialize();await this.run('UPDATE factory_steps SET status=?,attempt=attempt+1,checkpoint_json=?,updated_at=? WHERE job_id=? AND name=?',[status,checkpoint?JSON.stringify(checkpoint):null,new Date().toISOString(),jobId,name]);}
  async getJob(id:string){await this.initialize();const job:any=await this.get('SELECT * FROM factory_jobs WHERE id=?',[id]);if(!job)throw new HarmonyError('JOB_NOT_FOUND',`Factory job ${id} не найден.`);const steps:any[]=await this.all('SELECT * FROM factory_steps WHERE job_id=? ORDER BY rowid',[id]);return{jobId:job.id,type:job.type,status:job.status,progress:job.progress,input:parse(job.input_json),result:parse(job.result_json),error:parse(job.error_json),cancelRequested:Boolean(job.cancel_requested),steps:steps.map(s=>({name:s.name,status:s.status,attempt:s.attempt,dependsOn:s.depends_on,checkpoint:parse(s.checkpoint_json)})),createdAt:job.created_at,updatedAt:job.updated_at};}
  async cancel(id:string){await this.initialize();await this.run("UPDATE factory_jobs SET cancel_requested=1,status=CASE WHEN status IN ('completed','failed') THEN status ELSE 'cancelled' END,updated_at=? WHERE id=?",[new Date().toISOString(),id]);return this.getJob(id);}
  async register(kind:string,name:string,revision:string,checksum:string,status:string,metadata:any){await this.initialize();const id=`${kind}_${crypto.createHash('sha256').update(`${name}:${revision}`).digest('hex').slice(0,16)}`;await this.run('INSERT OR REPLACE INTO factory_registry VALUES(?,?,?,?,?,?,?,?)',[id,kind,name,revision,checksum,status,JSON.stringify(metadata),new Date().toISOString()]);return{id,kind,name,revision,checksum,status,metadata};}
  async listRegistry(kind?:string){await this.initialize();const rows:any[]=kind?await this.all('SELECT * FROM factory_registry WHERE kind=?',[kind]):await this.all('SELECT * FROM factory_registry',[]);return rows.map(r=>({...r,metadata:parse(r.metadata_json)}));}
  async ingest(source:string,mediaType='application/octet-stream'){await this.initialize();const real=verifyPathAccess(source);if(!fs.statSync(real).isFile())throw new Error('Artifact source is not a file');const sha=await hashFile(real),dir=path.join(this.root,'objects',sha.slice(0,2)),stored=path.join(dir,sha);fs.mkdirSync(dir,{recursive:true});if(!fs.existsSync(stored))fs.copyFileSync(real,stored);const size=fs.statSync(stored).size,id=`artifact_${sha.slice(0,20)}`;await this.run('INSERT OR IGNORE INTO factory_artifacts VALUES(?,?,?,?,?,?,?)',[id,sha,size,mediaType,real,stored,new Date().toISOString()]);return{id,sha256:sha,size,mediaType,sourcePath:real,storedPath:stored,verified:fs.statSync(stored).size===size};}
  async metric(name:string,value:number,labels:any={}){await this.initialize();await this.run('INSERT INTO factory_metrics(name,value,labels_json,created_at) VALUES(?,?,?,?)',[name,value,JSON.stringify(labels),new Date().toISOString()]);}

  async getSchemaVersion(): Promise<number> {
    await this.initialize();
    const row = await this.get('PRAGMA user_version', []);
    return Number(row?.user_version ?? 0);
  }

  async recordStageArtifact(
    jobId: string,
    stage: MohoProductionV3Stage,
    sourcePath: string,
    mediaType: string,
    provenance: Record<string, unknown>
  ): Promise<FactoryStageArtifact> {
    await this.getJob(jobId);
    const artifact = await this.ingest(sourcePath, mediaType);
    const stageArtifactId = `stage_artifact_${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    await this.run(
      'INSERT INTO factory_stage_artifacts(id,job_id,stage,artifact_id,sha256,provenance_json,valid,created_at) VALUES(?,?,?,?,?,?,1,?)',
      [stageArtifactId, jobId, stage, artifact.id, artifact.sha256, JSON.stringify(provenance), createdAt]
    );
    return {
      stageArtifactId,
      jobId,
      stage,
      artifactId: artifact.id,
      sha256: artifact.sha256,
      sourcePath: artifact.sourcePath,
      storedPath: artifact.storedPath,
      provenance,
      valid: true,
      createdAt
    };
  }

  async listStageArtifacts(jobId: string, stage?: MohoProductionV3Stage): Promise<FactoryStageArtifact[]> {
    await this.initialize();
    const rows = stage
      ? await this.all('SELECT s.*,a.source_path,a.stored_path FROM factory_stage_artifacts s JOIN factory_artifacts a ON a.id=s.artifact_id WHERE s.job_id=? AND s.stage=? ORDER BY s.rowid', [jobId, stage])
      : await this.all('SELECT s.*,a.source_path,a.stored_path FROM factory_stage_artifacts s JOIN factory_artifacts a ON a.id=s.artifact_id WHERE s.job_id=? ORDER BY s.rowid', [jobId]);
    return rows.map(row => ({
      stageArtifactId: row.id,
      jobId: row.job_id,
      stage: row.stage,
      artifactId: row.artifact_id,
      sha256: row.sha256,
      sourcePath: row.source_path,
      storedPath: row.stored_path,
      provenance: parse(row.provenance_json) ?? {},
      valid: Boolean(row.valid),
      createdAt: row.created_at
    }));
  }

  async requestApproval(
    jobId: string,
    gate: MohoProductionV3Gate,
    stage: MohoProductionV3Stage,
    artifactIds: string[]
  ): Promise<FactoryApproval> {
    await this.getJob(jobId);
    const existing = await this.get(
      "SELECT id FROM factory_approvals WHERE job_id=? AND gate=? AND status='pending' ORDER BY rowid DESC LIMIT 1",
      [jobId, gate]
    );
    if (existing) {
      throw new Error(`Approval ${gate} is already pending for job ${jobId}.`);
    }
    const approvalId = `approval_${crypto.randomUUID()}`;
    const requestedAt = new Date().toISOString();
    const retakeIndex = await this.countApprovalRejects(jobId);
    await this.run(
      'INSERT INTO factory_approvals(id,job_id,gate,stage,status,artifact_ids_json,decision_json,requested_at,decided_at,decided_by,retake_index,invalidated_reason) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
      [approvalId, jobId, gate, stage, 'pending', JSON.stringify(artifactIds), null, requestedAt, null, null, retakeIndex, null]
    );
    return {
      approvalId,
      jobId,
      gate,
      stage,
      status: 'pending',
      artifactIds,
      decision: null,
      requestedAt,
      decidedAt: null,
      decidedBy: null,
      retakeIndex,
      invalidatedReason: null
    };
  }

  async decideApproval(
    approvalId: string,
    decision: 'approve' | 'reject',
    decidedBy: string,
    feedback: { text: string; annotationPaths?: string[]; patches?: unknown[] }
  ): Promise<FactoryApproval> {
    await this.initialize();
    const current = await this.get('SELECT * FROM factory_approvals WHERE id=?', [approvalId]);
    if (!current) throw new Error(`Approval ${approvalId} not found.`);
    if (current.status !== 'pending') throw new Error(`Approval ${approvalId} is not pending.`);
    const decidedAt = new Date().toISOString();
    const status = decision === 'approve' ? 'approved' : 'rejected';
    const decisionJson = { decision, ...feedback };
    const retakeIndex = decision === 'reject'
      ? (await this.countApprovalRejects(current.job_id)) + 1
      : Number(current.retake_index);
    await this.run(
      'UPDATE factory_approvals SET status=?,decision_json=?,decided_at=?,decided_by=?,retake_index=? WHERE id=?',
      [status, JSON.stringify(decisionJson), decidedAt, decidedBy, retakeIndex, approvalId]
    );
    return (await this.listApprovals(current.job_id)).find(item => item.approvalId === approvalId)!;
  }

  async listApprovals(jobId: string): Promise<FactoryApproval[]> {
    await this.initialize();
    const rows = await this.all('SELECT * FROM factory_approvals WHERE job_id=? ORDER BY rowid', [jobId]);
    return rows.map(row => ({
      approvalId: row.id,
      jobId: row.job_id,
      gate: row.gate,
      stage: row.stage,
      status: row.status,
      artifactIds: parse(row.artifact_ids_json) ?? [],
      decision: parse(row.decision_json),
      requestedAt: row.requested_at,
      decidedAt: row.decided_at,
      decidedBy: row.decided_by,
      retakeIndex: Number(row.retake_index),
      invalidatedReason: row.invalidated_reason
    }));
  }

  async countApprovalRejects(jobId: string): Promise<number> {
    await this.initialize();
    const row = await this.get(
      "SELECT COUNT(*) AS count FROM factory_approvals WHERE job_id=? AND status='rejected'",
      [jobId]
    );
    return Number(row?.count ?? 0);
  }

  async invalidateStagesFrom(
    jobId: string,
    stage: MohoProductionV3Stage,
    orderedStages: MohoProductionV3Stage[],
    role: FactoryRole,
    reason: string
  ): Promise<void> {
    await this.getJob(jobId);
    const startIndex = orderedStages.indexOf(stage);
    if (startIndex < 0) throw new Error(`Unknown stage ${stage}.`);
    const affected = orderedStages.slice(startIndex);
    const approvals = await this.listApprovals(jobId);
    const invalidatesApprovedStage = approvals.some(
      approval => approval.status === 'approved' && affected.includes(approval.stage as MohoProductionV3Stage)
    );
    if (invalidatesApprovedStage && rank[role] < rank.director) {
      throw new Error('Resetting an approved stage requires director role.');
    }
    if (invalidatesApprovedStage && reason.trim().length === 0) {
      throw new Error('Resetting an approved stage requires a reason.');
    }
    await this.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      for (const affectedStage of affected) {
        await this.run(
          "UPDATE factory_steps SET status='pending',checkpoint_json=NULL,updated_at=? WHERE job_id=? AND name=?",
          [new Date().toISOString(), jobId, affectedStage]
        );
        await this.run(
          'UPDATE factory_stage_artifacts SET valid=0 WHERE job_id=? AND stage=?',
          [jobId, affectedStage]
        );
      }
      const placeholders = affected.map(() => '?').join(',');
      await this.run(
        `UPDATE factory_approvals SET status='invalidated',invalidated_reason=? WHERE job_id=? AND stage IN (${placeholders}) AND status IN ('pending','approved')`,
        [reason, jobId, ...affected]
      );
      await this.run(
        "UPDATE factory_jobs SET status='queued',progress=?,result_json=NULL,error_json=NULL,cancel_requested=0,updated_at=? WHERE id=?",
        [startIndex / orderedStages.length, new Date().toISOString(), jobId]
      );
      await this.exec('COMMIT');
    } catch (error) {
      await this.exec('ROLLBACK');
      throw error;
    }
  }

  async recordModelCall(input: FactoryModelCallInput): Promise<{ callId: string } & FactoryModelCallInput> {
    await this.getJob(input.jobId);
    if (!/^[a-f0-9]{64}$/.test(input.requestSha256)) throw new Error('requestSha256 must be a SHA-256 digest.');
    if (input.responseSha256 && !/^[a-f0-9]{64}$/.test(input.responseSha256)) throw new Error('responseSha256 must be a SHA-256 digest.');
    const callId = `model_call_${crypto.randomUUID()}`;
    await this.run(
      'INSERT INTO factory_model_calls(id,job_id,stage,provider,model,request_sha256,response_sha256,status,metadata_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
      [callId, input.jobId, input.stage, input.provider, input.model, input.requestSha256, input.responseSha256 ?? null, input.status, JSON.stringify(input.metadata ?? {}), new Date().toISOString()]
    );
    return { callId, ...input };
  }

  async listModelCalls(jobId: string): Promise<Array<{
    callId: string;
    jobId: string;
    stage: string;
    provider: string;
    model: string;
    requestSha256: string;
    responseSha256: string | null;
    status: string;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>> {
    await this.initialize();
    const rows = await this.all('SELECT * FROM factory_model_calls WHERE job_id=? ORDER BY rowid', [jobId]);
    return rows.map(row => ({
      callId: row.id,
      jobId: row.job_id,
      stage: row.stage,
      provider: row.provider,
      model: row.model,
      requestSha256: row.request_sha256,
      responseSha256: row.response_sha256,
      status: row.status,
      metadata: parse(row.metadata_json) ?? {},
      createdAt: row.created_at
    }));
  }
  private exec(sql:string){return new Promise<void>((ok,bad)=>this.db.exec(sql,e=>e?bad(e):ok()));} private run(sql:string,p:any[]){return new Promise<void>((ok,bad)=>this.db.run(sql,p,e=>e?bad(e):ok()));} private get(sql:string,p:any[]){return new Promise<any>((ok,bad)=>this.db.get(sql,p,(e,r)=>e?bad(e):ok(r)));} private all(sql:string,p:any[]){return new Promise<any[]>((ok,bad)=>this.db.all(sql,p,(e,r)=>e?bad(e):ok(r)));}

  /**
   * executeJob — the real pipeline-producer executor.
   *
   * Runs a job's steps in depends_on order (topological for chain deps),
   * re-checking cancel_requested in the DB before EVERY attempt so an external
   * `cancel()` call stops the job between steps, retrying failed steps up to
   * maxAttemptsPerStep, and updating job status/progress as it goes.
   *
   * Handlers map step name -> async unit of work returning a checkpoint
   * payload. A handler that throws counts as one failed attempt; the error is
   * stored on the job. Statuses: running -> completed | failed | cancelled.
   */
  async executeJob(jobId:string, handlers:Record<string,()=>Promise<any>>, opts:{maxAttemptsPerStep?:number}={}):Promise<ReturnType<FactoryFoundationStore['getJob']>>{
    await this.initialize();
    const maxAttempts=Math.max(1,opts.maxAttemptsPerStep??1);
    let job=await this.getJob(jobId);
    if(['completed','failed','cancelled'].includes(job.status))return job;
    const pending=job.steps.filter(s=>s.status!=='completed');
    // Topological order over single-parent depends_on chains (cycle = config bug).
    const byName=new Map(job.steps.map(s=>[s.name,s]));
    const ordered:any[]=[];const seen=new Set<string>();
    const visit=(s:any)=>{if(seen.has(s.name))return;seen.add(s.name);if(s.dependsOn&&byName.has(s.dependsOn))visit(byName.get(s.dependsOn));ordered.push(s);};
    pending.forEach(visit);
    if(ordered.length!==pending.length)throw new Error(`Job ${jobId} step dependencies contain a cycle`);

    await this.setJob(jobId,'running',job.progress);
    let done=job.steps.length-pending.length;
    try{
      for(const step of ordered){
        let attemptBase=step.attempt;
        for(let attempt=1;attempt<=maxAttempts;attempt++){
          job=await this.getJob(jobId);
          if(job.cancelRequested){
            await this.setStep(jobId,step.name,'cancelled',{reason:'cancel_requested'});
            await this.setJob(jobId,'cancelled',done/job.steps.length);
            return this.getJob(jobId);
          }
          try{
            const checkpoint=handlers[step.name]?await handlers[step.name]():null;
            await this.setStep(jobId,step.name,'completed',checkpoint);
            break;
          }catch(err:any){
            const last=attempt===maxAttempts;
            await this.setStep(jobId,step.name,last?'failed':'retrying',{error:String(err?.message??err),attempt:attemptBase+attempt});
            if(last){
              await this.setJob(jobId,'failed',done/job.steps.length,null,{step:step.name,error:String(err?.message??err)});
              return this.getJob(jobId);
            }
          }
        }
        if((await this.getStep(jobId,step.name))!=='completed'){
          return this.getJob(jobId);
        }
        done+=1;
        await this.setJob(jobId,'running',done/job.steps.length);
      }
      job=await this.getJob(jobId);
      await this.setJob(jobId, job.cancelRequested?'cancelled':'completed', 1, {stepsCompleted:done});
    }catch(err:any){
      await this.setJob(jobId,'failed',(await this.getJob(jobId)).progress,null,{executorError:String(err?.message??err)});
    }
    return this.getJob(jobId);
  }

  private async getStep(jobId:string,name:string){const r:any=await this.get('SELECT status FROM factory_steps WHERE job_id=? AND name=?',[jobId,name]);return r?.status;}
}
function parse(v:any){if(!v)return null;try{return JSON.parse(v);}catch{return v;}} async function hashFile(file:string){const h=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))h.update(chunk as Buffer);return h.digest('hex');}
