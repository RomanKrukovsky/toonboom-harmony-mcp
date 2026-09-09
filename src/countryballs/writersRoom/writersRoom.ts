import { CountryballsSeriesBible } from '../../schemas/countryballs/seriesBible.js';
import { ContinuityLedger } from '../seriesBible/continuityLedger.js';
import { ComedyBeat } from '../comedy/comedyEngine.js';

export interface WritersRoomOptions {
  topic: string;
  tone?: string;
  mainCharacters?: string[];
  targetDurationSeconds?: number;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  emotion: string;
  subtext: string;
  suggestedAction?: string;
}

export interface StoryBeat {
  act: 1 | 2 | 3;
  beatType: 'status_quo' | 'inciting_incident' | 'escalation' | 'crisis' | 'punchline_climax';
  description: string;
  dialogues: DialogueLine[];
  comedyBeats: ComedyBeat[];
}

export interface CountryballsScreenplay {
  title: string;
  logline: string;
  researchTrivia: string[];
  characters: string[];
  beats: StoryBeat[];
  screenplayMarkdown: string;
}

export class CountryballsWritersRoom {
  private bible: CountryballsSeriesBible;
  private continuity: ContinuityLedger;

  constructor(bible: CountryballsSeriesBible, continuity?: ContinuityLedger) {
    this.bible = bible;
    this.continuity = continuity || new ContinuityLedger();
  }

  /**
   * Translates neutral dialogue into character-specific Countryball dialect.
   */
  public dialectize(text: string, characterId: string): string {
    const char = this.bible.characters[characterId];
    if (!char) return text;

    switch (char.dialect) {
      case 'broken_english':
        // Classic Polandball dialect
        return text
          .replace(/\bI can\b/gi, 'I of can')
          .replace(/\bI cannot\b/gi, 'I cannot into')
          .replace(/\blook\b/gi, 'lookings')
          .replace(/\bhave\b/gi, 'haves')
          .replace(/\bam\b/gi, 'is')
          .replace(/\bmy\b/gi, 'my glorious')
          .replace(/\bspace\b/gi, 'space!')
          .concat(' Kurwa!');

      case 'slavic_dry':
        // Russian dry suspicious tone
        return text
          .replace(/\bIs this\b/gi, 'What is')
          .replace(/\bYou are\b/gi, 'You is')
          .replace(/\bgood\b/gi, 'not terrible')
          .concat(' Blyat.');

      case 'american_boisterous':
        // USA loud boastful tone
        return 'Listen up! ' + text
          .replace(/\bI have\b/gi, 'We got')
          .replace(/\bmoney\b/gi, 'freedom dollars')
          .concat(' Hell yeah!');

      case 'germanic_clipped':
        // German orderly tone
        return 'Achtung. ' + text
          .replace(/\bwork\b/gi, 'wörk')
          .replace(/\bno\b/gi, 'nein')
          .concat(' Ordnung must be.');

      case 'british_snobbish':
        // British posh sarcasm
        return 'I say, ' + text
          .replace(/\bman\b/gi, 'chap')
          .replace(/\bproblem\b/gi, 'slight inconvenience')
          .concat(', pip pip.');

      case 'french_melodramatic':
        return 'Hon hon, ' + text
          .replace(/\byes\b/gi, 'oui')
          .concat(', c\'est la vie.');

      case 'neutral_english':
        return text;

      default: {
        const _exhaustiveCheck: never = char.dialect;
        return text;
      }
    }
  }

  /**
   * Executes the 6-stage Writers Room pipeline.
   */
  public produceScreenplay(options: WritersRoomOptions): CountryballsScreenplay {
    const characters = options.mainCharacters && options.mainCharacters.length >= 2
      ? options.mainCharacters
      : ['Poland', 'Russia', 'USA', 'Germany'];

    // Stage 1: Showrunner Agent
    const title = `The Great ${options.topic.replace(/[^a-zA-Z0-9 ]/g, '')} Debacle`;
    const logline = `${characters[0]} attempts ${options.topic}, but geopolitical rivalries between ${characters.slice(1).join(' and ')} turn it into an international catastrophe.`;

    // Stage 2: Researcher Agent
    const researchTrivia = [
      'Historically, space missions require immense capital and precision engineering.',
      'Countryball memes dictate that Poland cannot into space no matter the circumstances.',
      'International treaties technically designate celestial bodies as common heritage of humanity.'
    ];

    // Stage 3 & 4: Story Architect + Comedy Writer
    const beats: StoryBeat[] = [
      // Act 1: Setup
      {
        act: 1,
        beatType: 'status_quo',
        description: `${characters[0]} arrives with grand ambition related to ${options.topic}.`,
        dialogues: [
          {
            speaker: characters[0],
            text: this.dialectize(`I have built new machine for ${options.topic}!`, characters[0]),
            emotion: 'triumphant',
            subtext: 'Deep insecurity masquerading as manic triumph',
            suggestedAction: 'jump_excited'
          },
          {
            speaker: characters[1],
            text: this.dialectize(`That is just cardboard box with plunger.`, characters[1]),
            emotion: 'deadpan',
            subtext: 'Bored cynical observation',
            suggestedAction: 'deadpan_stare'
          }
        ],
        comedyBeats: [
          {
            pattern: 'setup_silence_reaction',
            setupText: `I have built new machine!`,
            punchlineText: `That is just cardboard box with plunger.`,
            initiatorActor: characters[0],
            targetActor: characters[1],
            suggestedHoldFrames: 16
          }
        ]
      },
      // Act 2: Escalation & Rivalry
      {
        act: 2,
        beatType: 'escalation',
        description: `${characters[2] || characters[1]} intervenes with absurd geopolitical dominance.`,
        dialogues: [
          {
            speaker: characters[2] || characters[0],
            text: this.dialectize(`Did someone mention oil or sovereign territory? Stand back, amateurs!`, characters[2] || characters[0]),
            emotion: 'boisterous',
            subtext: 'Overwhelming unsolicited intervention',
            suggestedAction: 'enter_fast_right'
          },
          {
            speaker: characters[1],
            text: this.dialectize(`You have no legal jurisdiction here.`, characters[1]),
            emotion: 'suspicious',
            subtext: 'Cold War reflex',
            suggestedAction: 'suspicious_narrow'
          }
        ],
        comedyBeats: [
          {
            pattern: 'escalation_rule_of_three',
            setupText: 'Stand back amateurs',
            punchlineText: 'You have no legal jurisdiction here',
            initiatorActor: characters[2] || characters[0],
            targetActor: characters[1],
            suggestedHoldFrames: 14
          }
        ]
      },
      // Act 3: Climax & Clueless Payoff
      {
        act: 3,
        beatType: 'punchline_climax',
        description: `The contraption misfires catastrophically, cementing the canonical status quo.`,
        dialogues: [
          {
            speaker: characters[0],
            text: this.dialectize(`Initiate launch countdown! Three, two, one!`, characters[0]),
            emotion: 'frantic',
            subtext: 'Impending doom',
            suggestedAction: 'rocket_launch'
          },
          {
            speaker: characters[3] || characters[1],
            text: this.dialectize(`Uncertified launch equipment violates regulation 404-B.`, characters[3] || characters[1]),
            emotion: 'deadpan',
            subtext: 'Bureaucratic priorities over human life',
            suggestedAction: 'awkward_side_eye'
          }
        ],
        comedyBeats: [
          {
            pattern: 'confidence_immediate_failure',
            setupText: 'Initiate launch countdown!',
            punchlineText: 'Violates regulation 404-B.',
            initiatorActor: characters[0],
            targetActor: characters[3] || characters[1],
            visualGagAction: 'flatten_pancake',
            suggestedHoldFrames: 20
          }
        ]
      }
    ];

    // Stage 5 & 6: Continuity & Screenplay Markdown formatting
    for (const b of beats) {
      for (const cb of b.comedyBeats) {
        this.continuity.recordJoke(title, cb.pattern, [cb.initiatorActor, cb.targetActor || ''], cb.setupText, cb.punchlineText);
      }
    }

    let md = `# ${title}\n\n`;
    md += `**Logline:** ${logline}\n\n`;
    md += `**Characters:** ${characters.join(', ')}\n\n`;
    md += `## Research Trivia\n${researchTrivia.map(t => `- ${t}`).join('\n')}\n\n`;
    md += `## Screenplay\n\n`;

    beats.forEach(b => {
      md += `### Act ${b.act} — Beat: ${b.beatType.toUpperCase()}\n`;
      md += `*${b.description}*\n\n`;
      b.dialogues.forEach(d => {
        md += `**${d.speaker.toUpperCase()}** (${d.emotion}) [${d.suggestedAction || 'idle'}]:\n`;
        md += `> "${d.text}"\n\n`;
      });
    });

    return {
      title,
      logline,
      researchTrivia,
      characters,
      beats,
      screenplayMarkdown: md
    };
  }
}
