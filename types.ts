
export interface ScriptScene {
  id: string;
  narration: string;
  narration_translation?: string; // Novo campo para tradução de referência
  visual_prompt: string;
  image_url?: string;
  audio_url?: string;
  isGeneratingImage: boolean;
  isGeneratingAudio: boolean;
  imageError?: string;
  audioError?: string;
}

export type AspectRatio = '16:9' | '9:16' | '1:1';
export type VideoType = 'short' | 'long';

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

export type EmotionPreset = 'suspense' | 'terror' | 'narrative' | 'aggressive' | 'shaky';
export type SpecialFX = 'none' | 'film_grain' | 'vhs_glitch' | 'cinematic_dust';
export type Nationality = 'PT-BR' | 'US';

export type AiProvider = 'openai' | 'gemini' | 'grok';
// AudioProvider atualizado sem standard
export type AudioProvider = 'openai_hd' | 'elevenlabs_turbo' | 'elevenlabs_quality' | 'browser_free';

export interface VoicePreset {
  id: string;
  name: string;
  voiceId: string;
  settings: VoiceSettings;
  emotionPreset: EmotionPreset;
  nationality: Nationality;
}

export interface GenerationConfig {
  provider: AiProvider;
  audioProvider: AudioProvider;
  apiKeys: {
    openai?: string;
    gemini?: string;
    grok?: string;
    elevenlabs?: string;
  };
}

export interface ProjectConfig {
  topic: string;
  hook: string;
  videoType: VideoType;
  introUrl: string | null;
  specialFX: SpecialFX;
  sceneCount: number;
  totalDuration: number;
  imageDuration: number;
  narratorTone: string;
  imageStyle: string;
  aspectRatio: AspectRatio;
  backgroundMusicUrl: string | null;
  musicVolume: number;
  elevenLabsVoiceId: string;
  voiceSettings: VoiceSettings;
  emotionPreset: EmotionPreset;
  nationality: Nationality;
}

export interface Voice {
  voice_id: string;
  name: string;
  preview_url?: string;
  nationality?: Nationality;
  // Provider base para categorização (openai, elevenlabs, etc)
  providerBase: 'openai' | 'elevenlabs' | 'browser_free';
}

export type AppStep = 'input' | 'scripting' | 'media' | 'preview';
