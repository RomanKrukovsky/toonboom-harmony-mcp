import crypto from 'crypto';

export interface RecordedJoke {
  hash: string;
  episodeId: string;
  type: string;
  actors: string[];
  setup: string;
  punchline: string;
  timestamp: string;
}

export interface LoreEvent {
  episodeId: string;
  description: string;
  affectedCharacters: string[];
  statusChange?: Record<string, any>;
}

export class ContinuityLedger {
  private jokes: RecordedJoke[] = [];
  private loreEvents: LoreEvent[] = [];

  constructor(initialData?: { jokes?: RecordedJoke[]; loreEvents?: LoreEvent[] }) {
    if (initialData?.jokes) this.jokes = [...initialData.jokes];
    if (initialData?.loreEvents) this.loreEvents = [...initialData.loreEvents];
  }

  public computeJokeHash(setup: string, punchline: string, actors: string[]): string {
    const normalized = `${actors.sort().join(',')}:${setup.toLowerCase().trim()}:${punchline.toLowerCase().trim()}`;
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  }

  public recordJoke(episodeId: string, type: string, actors: string[], setup: string, punchline: string): RecordedJoke {
    const hash = this.computeJokeHash(setup, punchline, actors);
    const entry: RecordedJoke = {
      hash,
      episodeId,
      type,
      actors,
      setup,
      punchline,
      timestamp: new Date().toISOString()
    };
    this.jokes.push(entry);
    return entry;
  }

  public hasJokeBeenUsed(setup: string, punchline: string, actors: string[]): boolean {
    const hash = this.computeJokeHash(setup, punchline, actors);
    return this.jokes.some(j => j.hash === hash);
  }

  public findSimilarJokes(keywords: string[]): RecordedJoke[] {
    const lowerKeys = keywords.map(k => k.toLowerCase());
    return this.jokes.filter(j => {
      const text = `${j.setup} ${j.punchline}`.toLowerCase();
      return lowerKeys.some(k => text.includes(k));
    });
  }

  public recordLoreEvent(event: LoreEvent): void {
    this.loreEvents.push(event);
  }

  public getLoreForCharacter(characterId: string): LoreEvent[] {
    return this.loreEvents.filter(e => e.affectedCharacters.includes(characterId));
  }

  public serialize(): { jokes: RecordedJoke[]; loreEvents: LoreEvent[] } {
    return {
      jokes: this.jokes,
      loreEvents: this.loreEvents
    };
  }
}
