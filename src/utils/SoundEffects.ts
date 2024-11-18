class SoundManager {
    private static instance: SoundManager;
    private sounds: Map<string, HTMLAudioElement> = new Map();
    private enabled: boolean = true;

    private constructor() {
        this.initializeSounds();
    }

    static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    private initializeSounds() {
        const soundEffects = {
            cardPlay: '/assets/sounds/card-play.mp3',
            cardDraw: '/assets/sounds/card-draw.mp3',
            chipMove: '/assets/sounds/chip-move.mp3',
            win: '/assets/sounds/win.mp3',
            lose: '/assets/sounds/lose.mp3',
            shuffle: '/assets/sounds/shuffle.mp3',
            error: '/assets/sounds/error.mp3',
            buttonClick: '/assets/sounds/button-click.mp3'
        };

        Object.entries(soundEffects).forEach(([key, path]) => {
            const audio = new Audio(path);
            audio.preload = 'auto';
            this.sounds.set(key, audio);
        });
    }

    play(soundName: string) {
        if (!this.enabled) return;
        
        const sound = this.sounds.get(soundName);
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(error => console.log('Error playing sound:', error));
        }
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    isEnabled(): boolean {
        return this.enabled;
    }
}

export const soundManager = SoundManager.getInstance(); 