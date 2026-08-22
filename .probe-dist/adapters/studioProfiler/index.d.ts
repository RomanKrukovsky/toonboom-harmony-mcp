import { type StudioProfile } from '../../schemas/studioIntelligence.js';
export declare class StudioProfiler {
    private profilesDir;
    private profiles;
    constructor(profilesDir?: string);
    private loadProfiles;
    private createDefaultProfiles;
    getProfile(profileId: string): StudioProfile | undefined;
    getAllProfiles(): StudioProfile[];
    createProfile(profile: Omit<StudioProfile, 'profileId'> & {
        profileId?: string;
    }): StudioProfile;
    saveProfile(profile: StudioProfile): void;
    deleteProfile(profileId: string): boolean;
    validateAgainstProfile(manifest: any, profileId: string): {
        passed: boolean;
        issues: string[];
    };
}
