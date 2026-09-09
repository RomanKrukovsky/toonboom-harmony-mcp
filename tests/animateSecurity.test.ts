import { animateConfig } from '../src/config.js';
import {
  AnimateError,
  enforceAnimateDestructiveSafety,
  verifyAnimatePathAccess
} from '../src/security.js';

describe('Adobe Animate Security & Safety', () => {
  it('blocks unconfirmed destructive operations', () => {
    expect(() => {
      enforceAnimateDestructiveSafety('test_destructive_delete', { confirm: false });
    }).toThrow(AnimateError);

    expect(() => {
      enforceAnimateDestructiveSafety('test_destructive_delete', {
        confirm: true,
        confirmationText: 'wrong text'
      });
    }).toThrow(AnimateError);
  });

  it('allows confirmed destructive operations when confirmation text matches', () => {
    const prev = animateConfig.allowDestructive;
    animateConfig.allowDestructive = true;
    try {
      expect(() => {
        enforceAnimateDestructiveSafety('test_destructive_delete', {
          confirm: true,
          confirmationText: 'Я понимаю, что это действие изменит документ Adobe Animate'
        });
      }).not.toThrow();

      expect(() => {
        enforceAnimateDestructiveSafety('test_destructive_delete', {
          confirm: true,
          confirmationText: 'I understand this destructive operation modifies Adobe Animate documents'
        });
      }).not.toThrow();
    } finally {
      animateConfig.allowDestructive = prev;
    }
  });

  it('verifies path access within allowed roots', () => {
    const cwd = process.cwd();
    expect(verifyAnimatePathAccess(cwd)).toBe(cwd);
  });

  it('throws ANIMATE_PATH_NOT_ALLOWED on unauthorized paths', () => {
    expect(() => {
      verifyAnimatePathAccess('/unauthorized/path/outside/workspace/doc.fla');
    }).toThrow('ANIMATE_PATH_NOT_ALLOWED');
  });
});
