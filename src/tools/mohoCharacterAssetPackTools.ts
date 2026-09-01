import { z } from 'zod';
import { validateMohoCharacterAssetPack } from '../services/mohoCharacterAssetPackValidator/index.js';

export const mohoCharacterAssetPackTools = [{
  name: 'moho.character_pack.validate',
  description: 'Validates a production Moho character pack, required views, drawing choices, joint overlap, transparent assets and SHA-256 hashes without modifying files.',
  inputSchema: z.object({
    packPath: z.string().min(1).describe('Absolute path to the character-pack JSON file.')
  }).strict(),
  handler: async (args: { packPath: string }) => validateMohoCharacterAssetPack(args.packPath)
}];
