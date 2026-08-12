import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

class MockMediaRecorder {
  static instances: MockMediaRecorder[] = [];
  mimeType = 'audio/webm';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  state: RecordingState = 'inactive';
  start = vi.fn(() => { this.state = 'recording'; });
  stop = vi.fn(() => {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['voice'], { type: 'audio/webm' }) } as BlobEvent);
    this.onstop?.();
  });

  constructor() { MockMediaRecorder.instances.push(this); }
}

async function openAnimalLesson(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Animals/ }));
  await user.click(screen.getByRole('button', { name: /Start Level 1/ }));
}

const ROUNDS = 4;
const playPrompt = () => (screen.getByText(/Tap the picture for/).textContent ?? '').match(/Tap the picture for (.+)\./)?.[1] ?? '';
const listenPrompt = () => (screen.getByRole('heading', { name: /Can you find/ }).textContent ?? '').match(/“(.+)”/)?.[1] ?? '';

async function clearRounds(user: ReturnType<typeof userEvent.setup>, readPrompt: () => string, lastLabel: RegExp) {
  const asked: string[] = [];
  for (let round = 1; round <= ROUNDS; round += 1) {
    const word = readPrompt();
    expect(word).toBeTruthy();
    asked.push(word);
    await user.click(screen.getByRole('button', { name: `Picture: ${word}` }));
    await user.click(screen.getByRole('button', { name: round === ROUNDS ? lastLabel : /Next word/ }));
  }
  return asked;
}

async function advanceToSpeak(user: ReturnType<typeof userEvent.setup>) {
  await openAnimalLesson(user);
  expect(screen.getAllByRole('button', { name: /^Say / })).toHaveLength(4);
  await user.click(screen.getByRole('button', { name: /Ready to play/ }));
  expect(screen.getByRole('heading', { name: 'Picture match' })).toBeInTheDocument();
  await clearRounds(user, playPrompt, /Next: listening/);
  await clearRounds(user, listenPrompt, /Next: speaking/);
  return screen.getByRole('button', { name: /Press and hold to speak/ });
}

async function recordAndFinishLesson(user: ReturnType<typeof userEvent.setup>) {
  const holdButton = await advanceToSpeak(user);
  fireEvent.keyDown(holdButton, { key: ' ', code: 'Space' });
  await waitFor(() => expect(MockMediaRecorder.instances[0].start).toHaveBeenCalled());
  fireEvent.keyUp(holdButton, { key: ' ', code: 'Space' });
  await waitFor(() => expect(screen.getByRole('button', { name: /Next: use the word/ })).toBeEnabled());
  await user.click(screen.getByRole('button', { name: /Next: use the word/ }));
  await user.click(screen.getByRole('button', { name: /I said it/ }));
}

describe('App flow', () => {
  const stopTrack = vi.fn();
  const createObjectURL = vi.fn(() => 'blob:recording');

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    stopTrack.mockClear();
    createObjectURL.mockClear();
    MockMediaRecorder.instances = [];
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { cancel: vi.fn(), speak: vi.fn() }
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: class {
        text: string;
        lang = '';
        rate = 1;
        pitch = 1;
        constructor(text: string) { this.text = text; }
      }
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] })
      }
    });
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: MockMediaRecorder });
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  });

  it('starts on the six illustrated theme choices', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: /Animals/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fruits/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Food/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Toys/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Colors/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vehicles/ })).toBeInTheDocument();
    expect(document.querySelectorAll('.theme-tile__art img')).toHaveLength(6);
  });

  it('opens a theme and explores all illustrated words', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Animals/ }));
    await user.click(screen.getByRole('button', { name: /Explore/ }));

    expect(screen.getByRole('heading', { name: /Animals words/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Say / })).toHaveLength(50);
    expect(document.querySelectorAll('.word-card__art img')).toHaveLength(50);
  });

  it('cycles through different everyday sentences for a word', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAnimalLesson(user);
    const firstSentence = document.querySelector('.copy-sentence strong')?.textContent;
    expect(firstSentence).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Show another sentence/ }));
    expect(document.querySelector('.copy-sentence strong')?.textContent).not.toBe(firstSentence);
    expect(screen.getByText(/2\/3/)).toBeInTheDocument();
  });

  it('uses a continuous progress meter and accessible picture labels', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAnimalLesson(user);

    expect(document.querySelector('.step-meter')).toHaveAttribute('aria-label', 'Step 1 of 6');
    expect(screen.getByRole('button', { name: /^Say /, pressed: true })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: /Ready to play/ }));
    expect(screen.getAllByRole('button', { name: /^Picture: / })).toHaveLength(4);
  });

  it('wakes the correct picture with a small magic reaction', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAnimalLesson(user);
    await user.click(screen.getByRole('button', { name: /Ready to play/ }));

    const gamePrompt = screen.getByText(/Tap the picture for/).textContent ?? '';
    const gameWord = gamePrompt.match(/Tap the picture for (.+)\./)?.[1];
    expect(gameWord).toBeTruthy();
    await user.click(screen.getByRole('button', { name: `Picture: ${gameWord}` }));

    expect(document.querySelector('.word-card.is-celebrating')).toHaveTextContent('★');
    expect(screen.getByText(/Meow!|Woof!|Tweet!|Splash!|Hop hop!|Quack!|Moo!|Oink!|Neigh!|Baa!/)).toBeInTheDocument();
  });

  it('asks for every lesson word before moving on to listening', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAnimalLesson(user);
    await user.click(screen.getByRole('button', { name: /Ready to play/ }));

    const asked: string[] = [];
    for (let round = 1; round <= ROUNDS; round += 1) {
      expect(document.querySelector('.lesson-heading .eyebrow')).toHaveTextContent(`word ${round} of ${ROUNDS}`);
      expect(document.querySelectorAll('.round-meter span.is-done')).toHaveLength(round - 1);
      const word = playPrompt();
      asked.push(word);
      expect(screen.getByRole('button', { name: round === ROUNDS ? /Next: listening/ : /Next word/ })).toBeDisabled();
      await user.click(screen.getByRole('button', { name: `Picture: ${word}` }));
      await user.click(screen.getByRole('button', { name: round === ROUNDS ? /Next: listening/ : /Next word/ }));
    }

    expect(new Set(asked).size).toBe(ROUNDS);
    expect(screen.getByRole('heading', { name: /Can you find/ })).toBeInTheDocument();
    expect(listenPrompt()).toBe(asked[0]);
  });

  it('keeps the heard word among the listening pictures every round', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAnimalLesson(user);
    await user.click(screen.getByRole('button', { name: /Ready to play/ }));
    await clearRounds(user, playPrompt, /Next: listening/);

    const heard = await clearRounds(user, listenPrompt, /Next: speaking/);
    expect(new Set(heard).size).toBe(ROUNDS);
    expect(screen.getByRole('button', { name: /Press and hold to speak/ })).toBeInTheDocument();
  });

  it('requires recording or an explicit skip before continuing', async () => {
    const user = userEvent.setup();
    render(<App />);

    await advanceToSpeak(user);

    expect(screen.getByRole('button', { name: /Next: use the word/ })).toBeDisabled();
    expect(screen.queryByRole('heading', { name: /Quest complete/ })).not.toBeInTheDocument();
  });

  it('records, offers playback, completes the level, and stores progress', async () => {
    const user = userEvent.setup();
    render(<App />);
    const holdButton = await advanceToSpeak(user);

    fireEvent.keyDown(holdButton, { key: ' ', code: 'Space' });
    expect(holdButton).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(MockMediaRecorder.instances[0].start).toHaveBeenCalled());
    fireEvent.keyUp(holdButton, { key: ' ', code: 'Space' });

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/recording is ready/));
    expect(stopTrack).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(screen.getByLabelText(/Hear your voice/)).toHaveAttribute('src', 'blob:recording');
    expect(screen.getByRole('button', { name: /Next: use the word/ })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /Next: use the word/ }));
    await user.click(screen.getByRole('button', { name: /I said it/ }));
    expect(screen.getByRole('heading', { name: /Quest complete/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Collect rewards/ }));
    expect(localStorage.getItem('little-english-progress-v2')).toContain('animals-sticker-1');
  });

  it('turns every learned word into a sticker and shows the album filling up', async () => {
    const user = userEvent.setup();
    render(<App />);
    await recordAndFinishLesson(user);

    expect(document.querySelectorAll('.reward-sticker')).toHaveLength(4);
    await user.click(screen.getByRole('button', { name: /Collect rewards/ }));

    expect(screen.getByLabelText(/Sticker album: 4 of 50 Animals words collected/)).toBeInTheDocument();
    expect(document.querySelectorAll('.sticker.is-earned')).toHaveLength(4);

    await user.click(screen.getByRole('button', { name: 'Home' }));
    expect(screen.getByLabelText('3 stars collected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Animals 4 of 50 words/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fruits 0 of 50 words/ })).toBeInTheDocument();
  });

  it('ignores repeated keyboard presses while recording', async () => {
    const user = userEvent.setup();
    render(<App />);
    const holdButton = await advanceToSpeak(user);

    fireEvent.keyDown(holdButton, { key: 'Enter', code: 'Enter' });
    fireEvent.keyDown(holdButton, { key: 'Enter', code: 'Enter', repeat: true });
    await waitFor(() => expect(MockMediaRecorder.instances).toHaveLength(1));
    fireEvent.keyUp(holdButton, { key: 'Enter', code: 'Enter' });
    await waitFor(() => expect(holdButton).toHaveAttribute('aria-pressed', 'false'));
  });

  it('offers an explicit skip when microphone permission is blocked', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('blocked')) }
    });
    const user = userEvent.setup();
    render(<App />);
    const holdButton = await advanceToSpeak(user);
    expect(screen.getByRole('button', { name: /Keep going without recording/ })).toBeInTheDocument();

    fireEvent.keyDown(holdButton, { key: ' ', code: 'Space' });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/blocked/));
    expect(screen.getByRole('button', { name: /Next: use the word/ })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Keep going without recording/ }));
    expect(screen.getByRole('button', { name: /Next: use the word/ })).toBeEnabled();
  });

  it('explains when sound playback is unavailable', async () => {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: undefined });
    const user = userEvent.setup();
    render(<App />);
    await openAnimalLesson(user);

    await user.click(screen.getByRole('button', { name: /^Say /, pressed: true }));
    expect(screen.getByText(/Sound is not available/)).toBeInTheDocument();
  });

  it('stops a microphone stream granted after leaving a lesson', async () => {
    let grantMicrophone: ((stream: MediaStream) => void) | undefined;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(() => new Promise<MediaStream>((resolve) => { grantMicrophone = resolve; })) }
    });
    const user = userEvent.setup();
    render(<App />);
    const holdButton = await advanceToSpeak(user);

    fireEvent.keyDown(holdButton, { key: ' ', code: 'Space' });
    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(grantMicrophone).toBeDefined();
    grantMicrophone?.({ getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream);
    await waitFor(() => expect(stopTrack).toHaveBeenCalled());
  });
});
