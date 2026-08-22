export declare class AssetPlanner {
    planAssets(requirements: any): Promise<{
        status: string;
        missingAssets: never[];
        fallbacksCreated: never[];
    }>;
}
