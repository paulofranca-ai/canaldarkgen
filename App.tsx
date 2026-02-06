
import React, { useState, useEffect, useRef } from 'react';
import { 
  Wand2, Video, Clock, Layers, Palette, Mic, Smartphone, Monitor, Square,
  RefreshCw, Skull, Ghost, Volume2, Zap, ChevronRight, Flame, Wind,
  Music as MusicIcon, Upload, VolumeX, Play, Clapperboard, Sparkles, Tv,
  Flag, Heart, Trash2, Save, Timer, Scissors, TrendingUp, BookOpen, Pause, BrainCircuit,
  Settings as SettingsIcon, Lock
} from 'lucide-react';
import ScriptEditor from './components/ScriptEditor';
import MediaGenerator from './components/MediaGenerator';
import PreviewPlayer from './components/PreviewPlayer';
import SettingsDialog from './components/SettingsDialog';
import LoginScreen from './components/LoginScreen';
import { generateStoryScript, generateViralIdeas } from './services/gemini';
import { getVoices, PREDEFINED_VOICES } from './services/elevenlabs';
import { authService } from './services/auth';
import { AppStep, ScriptScene, ProjectConfig, Voice, EmotionPreset, SpecialFX, Nationality, VoicePreset, VoiceSettings, VideoType, AudioProvider } from './types';

const EMOTION_PRESETS: { id: EmotionPreset; label: string; icon: any; settings: VoiceSettings }[] = [
  { id: 'suspense', label: 'Suspense', icon: <Ghost className="w-4 h-4"/>, settings: { stability: 0.8, similarity_boost: 0.8, style: 0.4, use_speaker_boost: true } },
  { id: 'terror', label: 'Terror Puro', icon: <Skull className="w-4 h-4"/>, settings: { stability: 0.4, similarity_boost: 0.9, style: 0.7, use_speaker_boost: true } },
  { id: 'narrative', label: 'Conto Cadenciado', icon: <Volume2 className="w-4 h-4"/>, settings: { stability: 0.6, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true } },
  { id: 'aggressive', label: 'Agressivo/Ação', icon: <Flame className="w-4 h-4"/>, settings: { stability: 0.3, similarity_boost: 0.95, style: 0.2, use_speaker_boost: true } },
  { id: 'shaky', label: 'Instável/Insano', icon: <Wind className="w-4 h-4"/>, settings: { stability: 0.1, similarity_boost: 1.0, style: 1.0, use_speaker_boost: true } },
];

const PRESET_MUSIC = [
  { name: 'Nenhum', url: null, icon: <VolumeX className="w-4 h-4" /> },
  { name: 'Abismo Sombrio', url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a7315b.mp3', icon: <MusicIcon className="w-4 h-4" /> },
  { name: 'Mistério Etéreo', url: 'https://cdn.pixabay.com/audio/2022/10/24/audio_3136209880.mp3', icon: <Ghost className="w-4 h-4" /> },
];

const FX_OPTIONS: { id: SpecialFX, label: string, icon: any }[] = [
  { id: 'none', label: 'Limpo', icon: <Monitor className="w-3 h-3"/> },
  { id: 'film_grain', label: 'Poeira de Filme', icon: <Sparkles className="w-3 h-3"/> },
  { id: 'vhs_glitch', label: 'VHS Retro', icon: <Tv className="w-3 h-3"/> },
  { id: 'cinematic_dust', label: 'Partículas', icon: <Wind className="w-3 h-3"/> },
];

const App = () => {
  // --- AUTH STATES ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasVault, setHasVault] = useState(false);
  
  // --- APP STATES ---
  const [step, setStep] = useState<AppStep>('input');
  const [voices, setVoices] = useState<Voice[]>(PREDEFINED_VOICES);
  const [customPresets, setCustomPresets] = useState<VoicePreset[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [currentAudioProvider, setCurrentAudioProvider] = useState<AudioProvider>('openai_hd');
  const introInputRef = useRef<HTMLInputElement>(null);
  
  // State for voice preview
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const voicePreviewRef = useRef<HTMLAudioElement | null>(null);

  const [projectConfig, setProjectConfig] = useState<ProjectConfig>({
    topic: '',
    hook: '',
    videoType: 'short',
    introUrl: null,
    specialFX: 'film_grain',
    sceneCount: 15,
    totalDuration: 45,
    imageDuration: 3,
    narratorTone: 'Misterioso e Profundo',
    imageStyle: 'Cinematic Dark Realism, 8k, Detailed Texture', 
    aspectRatio: '9:16',
    backgroundMusicUrl: PRESET_MUSIC[1].url,
    musicVolume: 0.2,
    elevenLabsVoiceId: '', 
    emotionPreset: 'suspense',
    voiceSettings: EMOTION_PRESETS[0].settings,
    nationality: 'PT-BR'
  });

  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [script, setScript] = useState<ScriptScene[]>([]);

  // Verifica status do cofre ao carregar
  useEffect(() => {
    setHasVault(authService.hasVault());
  }, []);

  // Carrega settings e vozes APÓS autenticação
  useEffect(() => {
    if (!isAuthenticated) return;

    getVoices().then(allVoices => {
        setVoices(allVoices);
        if(!projectConfig.elevenLabsVoiceId && allVoices.length > 0) {
            setProjectConfig(p => ({...p, elevenLabsVoiceId: allVoices[0].voice_id}));
        }
    });

    const savedPresets = localStorage.getItem('darkstream_voice_presets_v2');
    if (savedPresets) setCustomPresets(JSON.parse(savedPresets));
    
    // Carrega provider preferido (não sensível)
    const providers = authService.getProviders();
    setCurrentAudioProvider(providers.audio);

    return () => {
      if(voicePreviewRef.current) voicePreviewRef.current.pause();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const calculatedScenes = Math.ceil(projectConfig.totalDuration / projectConfig.imageDuration);
    if (calculatedScenes !== projectConfig.sceneCount) {
      setProjectConfig(prev => ({ ...prev, sceneCount: calculatedScenes }));
    }
  }, [projectConfig.totalDuration, projectConfig.imageDuration]);

  // Se não estiver autenticado, mostra login ou setup
  if (!isAuthenticated) {
    return (
      <LoginScreen 
        isSetupMode={!hasVault} 
        onUnlock={() => {
          setIsAuthenticated(true);
          setHasVault(true);
        }} 
      />
    );
  }

  const handleLogout = () => {
    authService.lock();
    setIsAuthenticated(false);
  };

  const handleTypeChange = (type: VideoType) => {
    setProjectConfig(prev => ({
      ...prev,
      videoType: type,
      aspectRatio: type === 'short' ? '9:16' : '16:9',
      totalDuration: type === 'short' ? 45 : 120,
      imageDuration: type === 'short' ? 3 : 5
    }));
  };

  const handleGenerateIdeas = async () => {
    setIsGeneratingIdeas(true);
    try {
      const ideas = await generateViralIdeas(projectConfig.videoType);
      updateConfig('topic', ideas.topic);
      updateConfig('hook', ideas.hook);
    } catch (e: any) {
      alert("Erro ao gerar ideias: " + e.message);
      if (e.message.includes("Key")) setShowSettings(true);
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!projectConfig.topic || !projectConfig.hook) {
      alert("Defina o Tópico e o Hook!");
      return;
    }
    setIsGeneratingScript(true);
    try {
      const generatedScenes = await generateStoryScript(projectConfig);
      const formattedScript: ScriptScene[] = generatedScenes.map((s, i) => ({
        ...s,
        id: `scene-${Date.now()}-${i}`,
        isGeneratingImage: false,
        isGeneratingAudio: false
      }));
      setScript(formattedScript);
      setStep('scripting');
    } catch (e: any) {
      alert(`Erro no Motor de IA: ${e.message}`);
      if (e.message.includes("Key")) setShowSettings(true);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const updateConfig = (key: keyof ProjectConfig, value: any) => {
    setProjectConfig(prev => ({ ...prev, [key]: value }));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const saveCurrentAsPreset = () => {
    const name = prompt("Nome do seu Preset:");
    if (!name) return;
    const newPreset: VoicePreset = {
      id: `preset-${Date.now()}`,
      name,
      voiceId: projectConfig.elevenLabsVoiceId,
      settings: projectConfig.voiceSettings,
      emotionPreset: projectConfig.emotionPreset,
      nationality: projectConfig.nationality
    };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    localStorage.setItem('darkstream_voice_presets_v2', JSON.stringify(updated));
  };

  const toggleVoicePreview = (voice: Voice) => {
    if (!voice.preview_url) {
      alert("Preview de áudio não configurado para esta voz nesta demo.");
      return;
    }

    if (playingPreviewId === voice.voice_id) {
      if (voicePreviewRef.current) {
        voicePreviewRef.current.pause();
        voicePreviewRef.current = null;
      }
      setPlayingPreviewId(null);
    } else {
      if (voicePreviewRef.current) voicePreviewRef.current.pause();
      const audio = new Audio(voice.preview_url);
      voicePreviewRef.current = audio;
      audio.play();
      setPlayingPreviewId(voice.voice_id);
      audio.onended = () => setPlayingPreviewId(null);
    }
  };

  const getProviderBase = (p: AudioProvider) => {
    if (p.includes('elevenlabs')) return 'elevenlabs';
    if (p.includes('openai')) return 'openai';
    return 'browser_free';
  };
  
  const currentProviderBase = getProviderBase(currentAudioProvider);
  const filteredVoices = voices.filter(v => 
    v.nationality === projectConfig.nationality && 
    v.providerBase === currentProviderBase
  );

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 pb-20 font-sans selection:bg-primary/40">
      <SettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} />
      
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Ghost className="w-7 h-7 text-primary" />
            <span className="font-serif font-black text-xl tracking-tighter text-white uppercase italic">
              CanalDarkGen
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
              <Zap className="w-3 h-3 text-primary animate-pulse" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cofre Aberto</span>
            </div>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-full hover:bg-white/10 transition-colors"
              title="Cofre & Chaves"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 text-red-500 hover:text-red-400 bg-red-500/10 rounded-full hover:bg-red-500/20 transition-colors"
              title="Bloquear (Sair)"
            >
              <Lock className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {step === 'input' && (
          <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-1000">
            <div className="text-center space-y-4">
              <h1 className="text-7xl font-serif font-black text-white leading-none tracking-tighter uppercase italic">
                Criação <span className="text-primary">Total</span>
              </h1>
              <p className="text-slate-500 font-medium tracking-wide">
                Arquitetura Dark para retenção infinita. Suporte até 10 minutos.
              </p>
            </div>

            <div className="bg-surface border border-white/5 rounded-[2.5rem] p-8 md:p-14 shadow-2xl space-y-12 overflow-hidden relative">
              <div className="grid grid-cols-2 gap-4 p-2 bg-black/40 rounded-3xl border border-white/5 max-w-md mx-auto">
                <button
                  onClick={() => handleTypeChange('short')}
                  className={`flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${projectConfig.videoType === 'short' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}
                >
                  <TrendingUp className="w-4 h-4" /> Shorts/TikTok
                </button>
                <button
                  onClick={() => handleTypeChange('long')}
                  className={`flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${projectConfig.videoType === 'long' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}
                >
                  <BookOpen className="w-4 h-4" /> Vídeo Longo
                </button>
              </div>

              <div className="relative border-2 border-white/5 rounded-[2rem] p-8 bg-black/20">
                <div className="flex justify-between items-center mb-6">
                   <div className="flex items-center gap-2">
                     <BrainCircuit className="w-5 h-5 text-primary" />
                     <h3 className="font-serif font-bold text-white uppercase tracking-widest text-sm">Núcleo Criativo</h3>
                   </div>
                   <button 
                    onClick={handleGenerateIdeas}
                    disabled={isGeneratingIdeas}
                    className="flex items-center gap-2 bg-gradient-to-r from-primary/80 to-purple-600/80 hover:from-primary hover:to-purple-600 text-white px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-primary/20 hover:scale-105 disabled:opacity-50 disabled:grayscale"
                   >
                     {isGeneratingIdeas ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />}
                     {isGeneratingIdeas ? 'Criando...' : 'Gerar Ideia Viral'}
                   </button>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-primary flex items-center gap-2">
                      <Flame className="w-3 h-3"/> O Gancho (Hooks que Prenden)
                    </label>
                    <textarea
                      value={projectConfig.hook}
                      onChange={(e) => updateConfig('hook', e.target.value)}
                      placeholder="Ex: Você nunca mais vai olhar para o mar da mesma forma depois de ouvir isso..."
                      className="w-full bg-black/50 border-2 border-white/5 rounded-[1.5rem] px-8 py-6 text-xl text-white outline-none focus:border-primary/40 transition-all min-h-[120px] resize-none shadow-inner"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">O que vamos revelar hoje?</label>
                    <input
                      type="text"
                      value={projectConfig.topic}
                      onChange={(e) => updateConfig('topic', e.target.value)}
                      placeholder="Tópico: Ex. A Verdade Oculta sobre a NASA"
                      className="w-full bg-black/50 border-2 border-white/5 rounded-2xl px-8 py-5 text-white outline-none focus:border-white/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-4 border-t border-white/5">
                <div className="space-y-10">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-primary flex items-center gap-2">
                        <Mic className="w-3 h-3" /> Narrador ({currentProviderBase.toUpperCase()})
                      </label>
                      <button onClick={saveCurrentAsPreset} className="text-[9px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full hover:bg-primary/20 transition-all uppercase border border-primary/20 flex items-center gap-2">
                         <Save className="w-3 h-3" /> Salvar Preset
                      </button>
                    </div>

                    <div className="flex gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
                      {(['PT-BR', 'US'] as Nationality[]).map(nat => (
                        <button
                          key={nat}
                          onClick={() => updateConfig('nationality', nat)}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${projectConfig.nationality === nat ? 'bg-primary text-white' : 'text-slate-500'}`}
                        >
                          {nat === 'PT-BR' ? 'Português (BR)' : 'English (US)'}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar relative">
                      {filteredVoices.length === 0 && (
                          <div className="col-span-2 text-center py-8 text-xs text-slate-500 border border-dashed border-white/10 rounded-xl">
                             Nenhuma voz encontrada para {projectConfig.nationality} em {currentProviderBase}.<br/>
                             Verifique as configurações (⚙️) ou mude a nacionalidade.
                          </div>
                      )}
                      
                      {filteredVoices.map(v => (
                        <div
                          key={v.voice_id}
                          className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer ${projectConfig.elevenLabsVoiceId === v.voice_id ? 'bg-primary/20 border-primary shadow-xl' : 'bg-black border-white/5 hover:border-white/20'}`}
                          onClick={() => updateConfig('elevenLabsVoiceId', v.voice_id)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-xs truncate ${projectConfig.elevenLabsVoiceId === v.voice_id ? 'text-white' : 'text-slate-400'}`}>{v.name}</p>
                          </div>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleVoicePreview(v); }}
                            className={`ml-2 p-2 rounded-full hover:bg-white/10 transition-colors ${playingPreviewId === v.voice_id ? 'text-primary' : 'text-slate-500'}`}
                          >
                            {playingPreviewId === v.voice_id ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                       <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Estilo Narrativo</label>
                       <div className="flex flex-wrap gap-2">
                        {EMOTION_PRESETS.map(ep => (
                          <button
                            key={ep.id}
                            onClick={() => {
                              updateConfig('emotionPreset', ep.id);
                              updateConfig('voiceSettings', ep.settings);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${projectConfig.emotionPreset === ep.id ? 'bg-white text-black border-white' : 'bg-black border-white/5 text-slate-500'}`}
                          >
                            {ep.icon} {ep.label}
                          </button>
                        ))}
                       </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Vinheta de Intro</label>
                    <button 
                      onClick={() => introInputRef.current?.click()}
                      className={`w-full p-5 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 transition-all ${projectConfig.introUrl ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-black border-white/10 text-slate-600 hover:border-primary/40'}`}
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{projectConfig.introUrl ? 'Intro Vinculada' : 'Upload Intro (MP4)'}</span>
                    </button>
                    <input type="file" ref={introInputRef} onChange={(e) => {
                      const file = e.target.files?.[0];
                      if(file) updateConfig('introUrl', URL.createObjectURL(file));
                    }} accept="video/*" className="hidden" />
                  </div>
                </div>

                <div className="space-y-10">
                  <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 space-y-8">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Duração Total</label>
                        <span className="text-xl font-serif font-black text-white italic">{formatTime(projectConfig.totalDuration)}</span>
                      </div>
                      <input 
                        type="range" min="15" max={projectConfig.videoType === 'short' ? 60 : 600} step="15"
                        value={projectConfig.totalDuration}
                        onChange={(e) => updateConfig('totalDuration', parseInt(e.target.value))}
                        className="w-full accent-primary h-2 bg-white/5 rounded-full appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-2">
                          <Scissors className="w-3 h-3" /> Intervalo Cena
                        </label>
                        <select 
                          value={projectConfig.imageDuration}
                          onChange={e => updateConfig('imageDuration', parseInt(e.target.value))}
                          className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs font-black text-white outline-none"
                        >
                          {[2, 3, 4, 5, 6, 8, 10].map(s => <option key={s} value={s}>{s} Segundos</option>)}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Cenas Planejadas</label>
                        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center font-black text-primary text-xs uppercase">
                          {projectConfig.sceneCount} IMAGENS
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Visual FX</label>
                    <div className="grid grid-cols-2 gap-3">
                      {FX_OPTIONS.map(fx => (
                        <button
                          key={fx.id}
                          onClick={() => updateConfig('specialFX', fx.id)}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-[10px] font-black uppercase ${projectConfig.specialFX === fx.id ? 'bg-white text-black border-white' : 'bg-black border-white/5 text-slate-500'}`}
                        >
                          {fx.icon} {fx.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateScript}
                    disabled={isGeneratingScript}
                    className="w-full bg-gradient-to-r from-primary to-violet-600 hover:scale-[1.02] text-white py-6 rounded-[1.5rem] font-black text-2xl uppercase tracking-[0.2em] italic flex items-center justify-center gap-4 transition-all shadow-2xl active:scale-95"
                  >
                    {isGeneratingScript ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Wand2 className="w-7 h-7" />}
                    {isGeneratingScript ? 'Mentalizando Narrativa...' : 'Forjar Conteúdo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'scripting' && <ScriptEditor script={script} onUpdateScript={setScript} onNext={() => setStep('media')} onBack={() => setStep('input')} />}
        {step === 'media' && <MediaGenerator script={script} config={{ provider: 'gemini', audioProvider: currentAudioProvider, apiKeys: {} }} projectConfig={projectConfig} onUpdateScript={setScript} onComplete={() => setStep('preview')} onBack={() => setStep('scripting')} />}
        {step === 'preview' && <PreviewPlayer script={script} projectConfig={projectConfig} onBack={() => setStep('media')} />}
      </main>
    </div>
  );
};

export default App;
