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
  start = vi.fn(() => {
    this.state = 'recording';
  });
  stop = vi.fn(() => {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['voice'], { type: 'audio/webm' }) } as BlobEvent);
    this.onstop?.();
  });

  constructor() {
    MockMediaRecorder.instances.push(this);
  }
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
      value: {
        cancel: vi.fn(),
        speak: vi.fn()
      }
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: class {
        text: string;
        lang = '';
        rate = 1;
        pitch = 1;

        constructor(text: string) {
          this.text = text;
        }
      }
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: stopTrack }]
        })
      }
    });
    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: MockMediaRecorder
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn()
    });
  });

  it('starts on the three theme home screen', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: /Animals/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fruits/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Food/ })).toBeInTheDocument();
  });

  it('opens a theme and explores words', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Animals/ }));
    await user.click(screen.getByRole('button', { name: /Explore/ }));

    expect(screen.getByRole('heading', { name: /Animals words/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cat/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Say/ })).toHaveLength(12);
  });

  it('completes the first animal level and stores progress', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Animals/ }));
    await user.click(screen.getByRole('button', { name: /Start/ }));
    await user.click(screen.getByRole('button', { name: /I know these words/ }));
    await user.click(screen.getByRole('button', { name: /cat/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.pointer([
      { keys: '[MouseLeft>]', target: screen.getByRole('button', { name: /Hold to say/ }) },
      { keys: '[/MouseLeft]', target: screen.getByRole('button', { name: /Hold to say/ }) }
    ]);
    await user.click(screen.getByRole('button', { name: /Finish/ }));

    expect(screen.getByRole('heading', { name: /Sticker earned/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Back to theme/ }));
    expect(localStorage.getItem('little-english-progress-v1')).toContain('animals-sticker-1');
  });

  it('updates Hold to say pressed state and status from keyboard controls', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Animals/ }));
    await user.click(screen.getByRole('button', { name: /Start/ }));
    await user.click(screen.getByRole('button', { name: /I know these words/ }));
    await user.click(screen.getByRole('button', { name: /cat/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    const holdButton = screen.getByRole('button', { name: /Hold to say/ });
    expect(holdButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('status')).toHaveTextContent(/Ready to speak/);

    fireEvent.keyDown(holdButton, { key: ' ', code: 'Space' });
    expect(holdButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(/Listening/);

    fireEvent.keyDown(holdButton, { key: ' ', code: 'Space', repeat: true });
    expect(holdButton).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyUp(holdButton, { key: ' ', code: 'Space' });
    expect(holdButton).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Nice speaking/));

    fireEvent.keyDown(holdButton, { key: 'Enter', code: 'Enter' });
    expect(holdButton).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyUp(holdButton, { key: 'Enter', code: 'Enter' });
    expect(holdButton).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Nice speaking/));
  });

  it('updates Hold to say pressed state from touch controls', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Animals/ }));
    await user.click(screen.getByRole('button', { name: /Start/ }));
    await user.click(screen.getByRole('button', { name: /I know these words/ }));
    await user.click(screen.getByRole('button', { name: /cat/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    const holdButton = screen.getByRole('button', { name: /Hold to say/ });

    fireEvent.touchStart(holdButton);
    expect(holdButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(/Listening/);

    fireEvent.touchEnd(holdButton);
    expect(holdButton).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Nice speaking/));
  });

  it('records the child voice while Hold to say is pressed and offers playback', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Animals/ }));
    await user.click(screen.getByRole('button', { name: /Start/ }));
    await user.click(screen.getByRole('button', { name: /I know these words/ }));
    await user.click(screen.getByRole('button', { name: /cat/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    const holdButton = screen.getByRole('button', { name: /Hold to say/ });

    fireEvent.touchStart(holdButton);

    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true }));
    await waitFor(() => expect(MockMediaRecorder.instances[0].start).toHaveBeenCalled());
    expect(holdButton).toHaveAttribute('aria-pressed', 'true');

    fireEvent.touchEnd(holdButton);

    await waitFor(() => expect(MockMediaRecorder.instances[0].stop).toHaveBeenCalled());
    expect(stopTrack).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(screen.getByLabelText(/Hear your voice/)).toHaveAttribute('src', 'blob:recording');
    expect(screen.getByRole('status')).toHaveTextContent(/Nice speaking/);
  });
});
