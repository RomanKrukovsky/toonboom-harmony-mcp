/**
 * DataRegistry.
 *
 * Catalogue of every external dataset that may be considered for training, evaluation or
 * retrieval inside this project. The catalogue does not download anything and does not copy
 * files; it stores metadata plus a per-version `DatasetVersionManifest` and answers
 * licensing / consent questions through `DatasetPolicyEngine`.
 *
 * Datasets with NC, research-only or territorially-incompatible licences are placed in a
 * physically separate `research` storage class so they cannot accidentally leak into a
 * commercial train, validation or model cache.
 */

import crypto from 'crypto';
import { z } from 'zod';
import { MlError } from '../../errors/mlErrorRegistry.js';

export const datasetStorageClassSchema = z.enum(['quarantine', 'first_party', 'research', 'commercial', 'evaluation']);
export type DatasetStorageClass = z.infer<typeof datasetStorageClassSchema>;

export const datasetCommercialTrainingSchema = z.enum(['allowed', 'allowed_with_attribution', 'forbidden', 'research_only', 'unknown']);
export type DatasetCommercialTraining = z.infer<typeof datasetCommercialTrainingSchema>;

export const datasetDerivedWeightsSchema = z.enum(['allowed', 'forbidden', 'unknown']);

export const datasetLicenseStatusSchema = z.enum([
  'production_allowed',
  'production_allowed_with_attribution',
  'preview_only',
  'research_only',
  'legal_review_required',
  'blocked',
  'unknown'
]);
export type DatasetLicenseStatus = z.infer<typeof datasetLicenseStatusSchema>;

export const datasetEntrySchema = z.object({
  datasetId: z.string().min(1),
  displayName: z.string().min(1),
  canonicalUrl: z.string().url(),
  steward: z.string().nullable(),
  license: z.object({
    fileLevelLicensing: z.boolean(),
    codeLicense: z.string().nullable(),
    datasetLicense: z.string().nullable(),
    commercialTraining: datasetCommercialTrainingSchema,
    derivedWeights: datasetDerivedWeightsSchema,
    redistribution: z.enum(['allowed', 'forbidden', 'unknown']),
    attribution: z.string().nullable(),
    territorialRestrictions: z.array(z.string()),
    personalData: z.enum(['none', 'low', 'medium', 'high', 'unknown']),
    biometricData: z.enum(['none', 'low', 'medium', 'high', 'unknown']),
    consentRequired: z.boolean(),
    status: datasetLicenseStatusSchema,
    legalNotes: z.string(),
    verifiedSourceUrls: z.array(z.string().url()),
    verifiedAt: z.string().nullable(),
    verifiedBy: z.string().nullable()
  }).strict(),
  defaultStorageClass: datasetStorageClassSchema,
  notes: z.string().optional()
}).strict();
export type DatasetEntry = z.infer<typeof datasetEntrySchema>;

export const datasetVersionManifestSchema = z.object({
  datasetId: z.string().min(1),
  release: z.string().min(1),
  manifestSha256: z.string().regex(/^[a-f0-9]{64}$/),
  files: z.array(z.object({
    relativePath: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    sizeBytes: z.number().int().nonnegative(),
    licence: z.string().nullable(),
    personalData: z.boolean(),
    biometricData: z.boolean(),
    commercialTraining: datasetCommercialTrainingSchema
  }).strict()),
  permittedTasks: z.array(z.string()),
  prohibitedTasks: z.array(z.string()),
  retentionPolicy: z.string(),
  verifiedAt: z.string().nullable(),
  verifiedBy: z.string().nullable()
}).strict();
export type DatasetVersionManifest = z.infer<typeof datasetVersionManifestSchema>;

/** The candidate datasets documented in the task brief. None are auto-downloaded. */
export const DEFAULT_CATALOGUE: DatasetEntry[] = [
  { datasetId: 'animerun', displayName: 'AnimeRun', canonicalUrl: 'https://lisiyao21.github.io/projects/AnimeRun', steward: 'lisiyao21', license: { fileLevelLicensing: false, codeLicense: null, datasetLicense: 'research-only terms apply', commercialTraining: 'research_only', derivedWeights: 'forbidden', redistribution: 'forbidden', attribution: 'lisiyao21/AnimeRun', territorialRestrictions: [], personalData: 'none', biometricData: 'none', consentRequired: false, status: 'research_only', legalNotes: 'AnimeRun is research-only and must remain in the `research` storage class.', verifiedSourceUrls: ['https://lisiyao21.github.io/projects/AnimeRun'], verifiedAt: null, verifiedBy: null }, defaultStorageClass: 'research' },
  { datasetId: 'atd-12k', displayName: 'ATD-12K (AnimeInterp)', canonicalUrl: 'https://github.com/lisiyao21/AnimeInterp', steward: 'lisiyao21', license: { fileLevelLicensing: false, codeLicense: null, datasetLicense: null, commercialTraining: 'unknown', derivedWeights: 'unknown', redistribution: 'unknown', attribution: null, territorialRestrictions: [], personalData: 'none', biometricData: 'none', consentRequired: false, status: 'legal_review_required', legalNotes: 'Linked via AnimeInterp repository. Not re-read this session.', verifiedSourceUrls: ['https://github.com/lisiyao21/AnimeInterp'], verifiedAt: null, verifiedBy: null }, defaultStorageClass: 'research' },
  { datasetId: 'linkto-anime', displayName: 'LinkTo-Anime', canonicalUrl: 'https://huggingface.co/datasets/LecterF/LinkTo-Anime', steward: 'LecterF', license: { fileLevelLicensing: false, codeLicense: null, datasetLicense: null, commercialTraining: 'unknown', derivedWeights: 'unknown', redistribution: 'unknown', attribution: null, territorialRestrictions: [], personalData: 'none', biometricData: 'none', consentRequired: false, status: 'legal_review_required', legalNotes: 'Hugging Face dataset card not re-read this session.', verifiedSourceUrls: ['https://huggingface.co/datasets/LecterF/LinkTo-Anime'], verifiedAt: null, verifiedBy: null }, defaultStorageClass: 'quarantine' },
  { datasetId: 'animated-drawings', displayName: 'Animated Drawings', canonicalUrl: 'https://github.com/facebookresearch/AnimatedDrawings', steward: 'facebookresearch', license: { fileLevelLicensing: false, codeLicense: null, datasetLicense: null, commercialTraining: 'unknown', derivedWeights: 'unknown', redistribution: 'unknown', attribution: null, territorialRestrictions: [], personalData: 'none', biometricData: 'none', consentRequired: false, status: 'legal_review_required', legalNotes: 'See repository LICENSE.', verifiedSourceUrls: ['https://github.com/facebookresearch/AnimatedDrawings'], verifiedAt: null, verifiedBy: null }, defaultStorageClass: 'quarantine' },
  { datasetId: 'quickdraw', displayName: 'Quick Draw', canonicalUrl: 'https://github.com/googlecreativelab/quickdraw-dataset', steward: 'Google Creative Lab', license: { fileLevelLicensing: true, codeLicense: 'Apache-2.0', datasetLicense: 'CC-BY-4.0', commercialTraining: 'allowed_with_attribution', derivedWeights: 'allowed', redistribution: 'allowed', attribution: 'Google Creative Lab / quickdraw-dataset', territorialRestrictions: [], personalData: 'none', biometricData: 'none', consentRequired: false, status: 'production_allowed_with_attribution', legalNotes: 'CC-BY-4.0 attribution required.', verifiedSourceUrls: ['https://github.com/googlecreativelab/quickdraw-dataset'], verifiedAt: null, verifiedBy: null }, defaultStorageClass: 'commercial' },
  { datasetId: 'deepsvg', displayName: 'DeepSVG', canonicalUrl: 'https://github.com/alexandre01/deepsvg', steward: 'alexandre01', license: { fileLevelLicensing: false, codeLicense: null, datasetLicense: null, commercialTraining: 'unknown', derivedWeights: 'unknown', redistribution: 'unknown', attribution: null, territorialRestrictions: [], personalData: 'none', biometricData: 'none', consentRequired: false, status: 'legal_review_required', legalNotes: 'See repository LICENSE.', verifiedSourceUrls: ['https://github.com/alexandre01/deepsvg'], verifiedAt: null, verifiedBy: null }, defaultStorageClass: 'quarantine' },
  { datasetId: 'amass', displayName: 'AMASS', canonicalUrl: 'https://amass.is.tue.mpg.de', steward: 'MPI', license: { fileLevelLicensing: false, codeLicense: null, datasetLicense: 'research-only', commercialTraining: 'research_only', derivedWeights: 'forbidden', redistribution: 'forbidden', attribution: null, territorialRestrictions: [], personalData: 'medium', biometricData: 'medium', consentRequired: true, status: 'research_only', legalNotes: 'AMASS is research-only and carries biometric risk; download requires signed data-use agreement.', verifiedSourceUrls: ['https://amass.is.tue.mpg.de'], verifiedAt: null, verifiedBy: null }, defaultStorageClass: 'research' },
  { datasetId: 'motion-x', displayName: 'Motion-X', canonicalUrl: 'https://github.com/IDEA-Research/Motion-X', steward: 'IDEA-Research', license: { fileLevelLicensing: false, codeLicense: null, datasetLicense: null, commercialTraining: 'unknown', derivedWeights: 'unknown', redistribution: 'unknown', attribution: null, territorialRestrictions: [], personalData: 'unknown', biometricData: 'unknown', consentRequired: false, status: 'legal_review_required', legalNotes: 'See repository LICENSE.', verifiedSourceUrls: ['https://github.com/IDEA-Research/Motion-X'], verifiedAt: null, verifiedBy: null }, defaultStorageClass: 'quarantine' },
  { datasetId: 'aistplusplus', displayName: 'AIST++', canonicalUrl: 'https://google.github.io/aistplusplus_dataset', steward: 'Google', license: { fileLevelLicensing: false, codeLicense: null, datasetLicense: null, commercialTraining: 'unknown', derivedWeights: 'unknown', redistribution: 'unknown', attribution: null, territorialRestrictions: [], personalData: 'medium', biometricData: 'medium', consentRequired: true, status: 'legal_review_required', legalNotes: 'AIST++ includes identifiable dancers; biometric review required.', verifiedSourceUrls: ['https://google.github.io/aistplusplus_dataset'], verifiedAt: null, verifiedBy: null }, defaultStorageClass: 'research' },
  { datasetId: 'beat', displayName: 'BEAT', canonicalUrl: 'https://github.com/PantoMatrix/BEAT', steward: 'PantoMatrix', license: { fileLevelLicensing: false, codeLicense: null, datasetLicense: null, commercialTraining: 'unknown', derivedWeights: 'unknown', redistribution: 'unknown', attribution: null, territorialRestrictions: [], personalData: 'high', biometricData: 'high', consentRequired: true, status: 'legal_review_required', legalNotes: 'BEAT includes face / motion capture; biometric and consent review required before any commercial use.', verifiedSourceUrls: ['https://github.com/PantoMatrix/BEAT'], verifiedAt: null, verifiedBy: null }, defaultStorageClass: 'research' },
  { datasetId: 'lrs2', displayName: 'LRS2', canonicalUrl: 'https://www.robots.ox.ac.uk/~vgg/data/lip_reading', steward: 'Oxford VGG', license: { fileLevelLicensing: false, codeLicense: null, datasetLicense: null, commercialTraining: 'unknown', derivedWeights: 'unknown', redistribution: 'unknown', attribution: null, territorialRestrictions: [], personalData: 'high', biometricData: 'high', consentRequired: true, status: 'legal_review_required', legalNotes: 'LRS2 contains face crops from BBC news; biometric and consent review required.', verifiedSourceUrls: ['https://www.robots.ox.ac.uk/~vgg/data/lip_reading'], verifiedAt: null, verifiedBy: null }, defaultStorageClass: 'research' },
  { datasetId: 'mozilla-common-voice', displayName: 'Mozilla Common Voice', canonicalUrl: 'https://commonvoice.mozilla.org/en/datasets', steward: 'Mozilla Foundation', license: { fileLevelLicensing: true, codeLicense: 'CC0-1.0', datasetLicense: 'CC0-1.0', commercialTraining: 'allowed_with_attribution', derivedWeights: 'allowed', redistribution: 'allowed', attribution: 'Mozilla Common Voice contributors', territorialRestrictions: [], personalData: 'high', biometricData: 'low', consentRequired: true, status: 'production_allowed_with_attribution', legalNotes: 'CC0-1.0 with mandatory consent text in the corpus.', verifiedSourceUrls: ['https://commonvoice.mozilla.org/en/datasets'], verifiedAt: null, verifiedBy: null }, defaultStorageClass: 'commercial' },
  { datasetId: 'ravdess', displayName: 'RAVDESS', canonicalUrl: 'https://zenodo.org/records/1188976', steward: 'Livingstone / Pitterman', license: { fileLevelLicensing: true, codeLicense: 'CC-BY-NC-4.0', datasetLicense: 'CC-BY-NC-4.0', commercialTraining: 'forbidden', derivedWeights: 'forbidden', redistribution: 'forbidden', attribution: 'Livingstone & Pitterman', territorialRestrictions: [], personalData: 'high', biometricData: 'high', consentRequired: true, status: 'blocked', legalNotes: 'NC-4.0 blocks any commercial use, train or eval.', verifiedSourceUrls: ['https://zenodo.org/records/1188976'], verifiedAt: null, verifiedBy: null }, defaultStorageClass: 'research' },
  { datasetId: 'felt', displayName: 'FELT', canonicalUrl: 'https://zenodo.org/records/13243600', steward: 'FELT team', license: { fileLevelLicensing: false, codeLicense: null, datasetLicense: null, commercialTraining: 'unknown', derivedWeights: 'unknown', redistribution: 'unknown', attribution: null, territorialRestrictions: [], personalData: 'high', biometricData: 'high', consentRequired: true, status: 'legal_review_required', legalNotes: 'FELT contains emotional speech with face video; full review required.', verifiedSourceUrls: ['https://zenodo.org/records/13243600'], verifiedAt: null, verifiedBy: null }, defaultStorageClass: 'research' },
  { datasetId: 'movienet', displayName: 'MovieNet', canonicalUrl: 'https://movienet.github.io', steward: 'MovieNet team', license: { fileLevelLicensing: false, codeLicense: null, datasetLicense: null, commercialTraining: 'unknown', derivedWeights: 'unknown', redistribution: 'unknown', attribution: null, territorialRestrictions: [], personalData: 'unknown', biometricData: 'unknown', consentRequired: false, status: 'legal_review_required', legalNotes: 'Metadata is not the same as a licence to redistribute the underlying films.', verifiedSourceUrls: ['https://movienet.github.io'], verifiedAt: null, verifiedBy: null }, defaultStorageClass: 'quarantine' },
  { datasetId: 'fsd50k', displayName: 'FSD50K', canonicalUrl: 'https://zenodo.org/records/4060432', steward: 'Fonseca', license: { fileLevelLicensing: true, codeLicense: 'CC-BY-4.0', datasetLicense: 'mixed — per-clip', commercialTraining: 'allowed_with_attribution', derivedWeights: 'allowed', redistribution: 'allowed', attribution: 'Fonseca et al., FSD50K', territorialRestrictions: [], personalData: 'none', biometricData: 'none', consentRequired: false, status: 'production_allowed_with_attribution', legalNotes: 'FSD50K is mixed-license per clip; `fileLevelLicensing: true` means the engine evaluates each file individually.', verifiedSourceUrls: ['https://zenodo.org/records/4060432'], verifiedAt: null, verifiedBy: null }, defaultStorageClass: 'commercial' },
  { datasetId: 'morevna-project', displayName: 'Morevna Project', canonicalUrl: 'https://morevnaproject.org', steward: 'Morevna team', license: { fileLevelLicensing: false, codeLicense: null, datasetLicense: null, commercialTraining: 'unknown', derivedWeights: 'unknown', redistribution: 'unknown', attribution: null, territorialRestrictions: [], personalData: 'none', biometricData: 'none', consentRequired: false, status: 'legal_review_required', legalNotes: 'Production files; licence per file.', verifiedSourceUrls: ['https://morevnaproject.org'], verifiedAt: null, verifiedBy: null }, defaultStorageClass: 'quarantine' },
  { datasetId: 'opentoonz-samples', displayName: 'OpenToonz sample scenes', canonicalUrl: 'https://opentoonz.github.io/e/download/sample.html', steward: 'OpenToonz', license: { fileLevelLicensing: false, codeLicense: null, datasetLicense: null, commercialTraining: 'unknown', derivedWeights: 'unknown', redistribution: 'unknown', attribution: null, territorialRestrictions: [], personalData: 'none', biometricData: 'none', consentRequired: false, status: 'legal_review_required', legalNotes: 'Per-file licensing on the sample bundle.', verifiedSourceUrls: ['https://opentoonz.github.io/e/download/sample.html'], verifiedAt: null, verifiedBy: null }, defaultStorageClass: 'quarantine' },
  { datasetId: 'blender-studio', displayName: 'Blender Studio', canonicalUrl: 'https://studio.blender.org', steward: 'Blender Foundation', license: { fileLevelLicensing: false, codeLicense: null, datasetLicense: null, commercialTraining: 'unknown', derivedWeights: 'unknown', redistribution: 'unknown', attribution: null, territorialRestrictions: [], personalData: 'unknown', biometricData: 'unknown', consentRequired: false, status: 'legal_review_required', legalNotes: 'Blender Studio files are CC-BY but the bundled production assets are evaluated per-file.', verifiedSourceUrls: ['https://studio.blender.org'], verifiedAt: null, verifiedBy: null }, defaultStorageClass: 'quarantine' }
];

export class DataRegistry {
  private readonly entries = new Map<string, DatasetEntry>();

  constructor(catalogue: DatasetEntry[] = DEFAULT_CATALOGUE) {
    for (const entry of catalogue) {
      const parsed = datasetEntrySchema.safeParse(entry);
      if (!parsed.success) throw new MlError('DATASET_NOT_REGISTERED', parsed.error.message);
      this.entries.set(parsed.data.datasetId, parsed.data);
    }
  }

  list(): DatasetEntry[] {
    return Array.from(this.entries.values());
  }

  get(datasetId: string): DatasetEntry | undefined {
    return this.entries.get(datasetId);
  }

  require(datasetId: string): DatasetEntry {
    const entry = this.entries.get(datasetId);
    if (!entry) throw new MlError('DATASET_NOT_REGISTERED', `dataset ${datasetId} is not registered`, { detail: { datasetId } });
    return entry;
  }

  /** Computes a stable manifest hash for a version (used as `manifestSha256`). */
  static manifestHash(manifest: DatasetVersionManifest): string {
    return crypto.createHash('sha256').update(JSON.stringify(manifest, Object.keys(manifest).sort())).digest('hex');
  }
}
