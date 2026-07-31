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

async function advanceToSpeak(user: ReturnType<typeof userEvent.setup>) {
  await openAnimalLesson(user);
  expect(screen.getAllByRole('button', { name: /^Say / })).toHaveLength(4);
  await user.click(screen.getByRole('button', { name: /Ready to play/ }));
  expect(screen.getByRole('heading', { name: 'Picture match' })).toBeInTheDocument();
  const gamePrompt = screen.getByText(/Tap the picture for/).textContent ?? '';
  const gameWord = gamePrompt.match(/Tap the picture for (.+)\./)?.[1];
  expect(gameWord).toBeTruthy();
  await user.click(screen.getByRole('button', { name: `Picture: ${gameWord}` }));
  await user.click(screen.getByRole('button', { name: /Next: listening/ }));

  const heading = screen.getByRole('heading', { name: /Can you find/ }).textContent ?? '';
  const promptWord = heading.match(/“(.+)”/)?.[1];
  expect(promptWord).toBeTruthy();
  await user.click(screen.getByRole('button', { name: `Picture: ${promptWord}` }));
  await user.click(screen.getByRole('button', { name: /Next: speaking/ }));
  return screen.getByRole('button', { name: /Press and hold to speak/ });
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
