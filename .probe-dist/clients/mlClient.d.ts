import { type MLSystemProfile, type MLJobResponse } from '../schemas/ml.js';
export declare class MLClient {
    private readonly baseUrl;
    private readonly timeoutMs;
    constructor(baseUrl?: string, timeoutMs?: number);
    private request;
    getSystemProfile(): Promise<MLSystemProfile>;
    listModels(): Promise<Array<any>>;
    installModel(modelId: string): Promise<any>;
    verifyModel(modelId: string): Promise<any>;
    listDatasets(): Promise<any>;
    segmentVideo(videoPath: string, modelId?: string): Promise<MLJobResponse>;
    estimatePose(videoPath: string, modelId?: string): Promise<MLJobResponse>;
    trackPoints(videoPath: string, queryPoints: Array<any>, modelId?: string): Promise<MLJobResponse>;
    transcribeAudio(audioPath: string, modelId?: string): Promise<MLJobResponse>;
    perceiveVideo(input: {
        videoPath: string;
        tasks: string[];
        audioPath?: string;
        profile?: string;
        quality?: string;
    }): Promise<MLJobResponse>;
    getJob(jobId: string): Promise<MLJobResponse>;
    cancelJob(jobId: string): Promise<MLJobResponse>;
    getJobArtifacts(jobId: string): Promise<any>;
}
