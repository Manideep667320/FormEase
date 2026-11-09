import "./env.ts";
import fs from "fs";
import path from "path";

export interface GnaniCreditStatus {
  totalCredits: number;
  remainingCredits: number;
  usedCredits: number;
  isConfigured: boolean;
}

export interface TtsRequestOptions {
  text: string;
  voice?: string;
  language?: string;
  speed?: number;
}

export interface TtsResponse {
  success: boolean;
  audioBase64?: string;
  format?: string;
  creditsUsed: number;
  remainingCredits: number;
  fallbackToBrowser?: boolean;
  message?: string;
}

export interface SttResponse {
  success: boolean;
  transcript?: string;
  creditsUsed: number;
  remainingCredits: number;
  fallbackToBrowser?: boolean;
  message?: string;
}

export interface GnaniLanguage {
  code: string;
  name: string;
  nativeName: string;
  defaultVoice: string;
  gender: "female" | "male";
}

export const GNANI_SUPPORTED_LANGUAGES: GnaniLanguage[] = [
  { code: "en-IN", name: "English (India)", nativeName: "English", defaultVoice: "Shivani", gender: "female" },
  { code: "hi-IN", name: "Hindi", nativeName: "हिन्दी", defaultVoice: "Shivani", gender: "female" },
  { code: "te-IN", name: "Telugu", nativeName: "తెలుగు", defaultVoice: "Lakshmi", gender: "female" },
  { code: "ta-IN", name: "Tamil", nativeName: "தமிழ்", defaultVoice: "Lakshmi", gender: "female" },
  { code: "kn-IN", name: "Kannada", nativeName: "ಕನ್ನಡ", defaultVoice: "Kalpana", gender: "female" },
  { code: "bn-IN", name: "Bengali", nativeName: "বাংলা", defaultVoice: "Riyaa", gender: "female" },
  { code: "mr-IN", name: "Marathi", nativeName: "मराठी", defaultVoice: "Chetana", gender: "female" },
  { code: "gu-IN", name: "Gujarati", nativeName: "ગુજરાતી", defaultVoice: "Vasudha", gender: "female" },
  { code: "ml-IN", name: "Malayalam", nativeName: "മലയാളം", defaultVoice: "Tarika", gender: "female" }
];

class GnaniService {
  private creditFilePath: string;
  private totalCredits: number;
  private remainingCredits: number;
  private usedCredits: number;

  constructor() {
    this.creditFilePath = path.resolve(process.cwd(), ".gnani-credits.json");
    this.totalCredits = Number(process.env.GNANI_INITIAL_CREDITS) || 5000;
    this.remainingCredits = this.totalCredits;
    this.usedCredits = 0;
    this.loadCreditState();
  }

  private loadCreditState() {
    try {
      if (fs.existsSync(this.creditFilePath)) {
        const raw = fs.readFileSync(this.creditFilePath, "utf8");
        const data = JSON.parse(raw);
        if (typeof data.remainingCredits === "number") {
          this.remainingCredits = data.remainingCredits;
          this.usedCredits = data.usedCredits || (this.totalCredits - this.remainingCredits);
        }
      }
    } catch (err) {
      console.warn("[Gnani] Could not read credit state file, using defaults:", err);
    }
  }

  private saveCreditState() {
    try {
      const data = {
        totalCredits: this.totalCredits,
        remainingCredits: this.remainingCredits,
        usedCredits: this.usedCredits,
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(this.creditFilePath, JSON.stringify(data, null, 2), "utf8");
    } catch (err) {
      console.warn("[Gnani] Could not persist credit state:", err);
    }
  }

  public getCreditStatus(): GnaniCreditStatus {
    const apiKey = process.env.GNANI_API_KEY || "";
    const isConfigured = Boolean(apiKey && !apiKey.includes("placeholder") && !apiKey.includes("your_gnani"));
    return {
      totalCredits: this.totalCredits,
      remainingCredits: this.remainingCredits,
      usedCredits: this.usedCredits,
      isConfigured
    };
  }

  private deductCredits(amount: number): boolean {
    if (this.remainingCredits < amount) {
      return false;
    }
    this.remainingCredits = Math.max(0, this.remainingCredits - amount);
    this.usedCredits += amount;
    this.saveCreditState();
    return true;
  }

  /**
   * Text-to-Speech via Gnani.ai Timbre API
   */
  public async textToSpeech(options: TtsRequestOptions): Promise<TtsResponse> {
    const text = options.text?.trim() || "";
    if (!text) {
      return {
        success: false,
        creditsUsed: 0,
        remainingCredits: this.remainingCredits,
        message: "Text is required for TTS"
      };
    }

    // Rate: 1 credit per 100 characters (min 1 credit)
    const cost = Math.max(1, Math.ceil(text.length / 100));

    if (this.remainingCredits < cost) {
      return {
        success: false,
        fallbackToBrowser: true,
        creditsUsed: 0,
        remainingCredits: this.remainingCredits,
        message: "Gnani API credits exhausted (5000 limit reached). Falling back to browser speech synthesis."
      };
    }

    const apiKey = process.env.GNANI_API_KEY || "";
    const baseUrl = process.env.GNANI_API_BASE_URL || "https://api.vachana.ai";
    const isKeySet = apiKey && !apiKey.includes("placeholder") && !apiKey.includes("your_gnani");

    if (!isKeySet) {
      // Key not configured yet: deduct credit simulation and advise fallback
      this.deductCredits(cost);
      return {
        success: true,
        fallbackToBrowser: true,
        creditsUsed: cost,
        remainingCredits: this.remainingCredits,
        message: `Gnani API Key not configured in .env. Deducted ${cost} test credit(s). Falling back to browser voice.`
      };
    }

    const selectedLang = options.language || process.env.GNANI_DEFAULT_LANG || "en-IN";
    const langConfig = GNANI_SUPPORTED_LANGUAGES.find(l => l.code === selectedLang) || GNANI_SUPPORTED_LANGUAGES[0];
    const voiceToUse = options.voice || langConfig.defaultVoice;

    try {
      const response = await fetch(`${baseUrl}/api/v1/tts/inference`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key-ID": apiKey
        },
        body: JSON.stringify({
          text,
          voice: voiceToUse,
          model: process.env.GNANI_TTS_MODEL || "timbre-v3.0",
          language: selectedLang,
          speed: options.speed || 1.0,
          audio_config: {
            sample_rate: 24000,
            num_channels: 1,
            encoding: "linear_pcm",
            container: "wav"
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Gnani TTS] API error:", response.status, errorText);
        return {
          success: false,
          fallbackToBrowser: true,
          creditsUsed: 0,
          remainingCredits: this.remainingCredits,
          message: `Gnani TTS API returned status ${response.status}. Using browser voice fallback.`
        };
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const audioBase64 = buffer.toString("base64");
      this.deductCredits(cost);

      return {
        success: true,
        audioBase64: `data:audio/wav;base64,${audioBase64}`,
        format: "audio/wav",
        creditsUsed: cost,
        remainingCredits: this.remainingCredits
      };
    } catch (err: any) {
      console.error("[Gnani TTS] Network exception:", err.message);
      return {
        success: false,
        fallbackToBrowser: true,
        creditsUsed: 0,
        remainingCredits: this.remainingCredits,
        message: `Gnani TTS connection error. Falling back to browser voice.`
      };
    }
  }

  /**
   * Speech-to-Text via Gnani.ai Prisma API
   */
  public async speechToText(audioBase64: string, language?: string): Promise<SttResponse> {
    if (!audioBase64) {
      return {
        success: false,
        creditsUsed: 0,
        remainingCredits: this.remainingCredits,
        message: "Audio data is required"
      };
    }

    const cost = 2; // 2 credits per transcription request
    if (this.remainingCredits < cost) {
      return {
        success: false,
        fallbackToBrowser: true,
        creditsUsed: 0,
        remainingCredits: this.remainingCredits,
        message: "Gnani API credits exhausted. Falling back to browser speech recognition."
      };
    }

    const apiKey = process.env.GNANI_API_KEY || "";
    const baseUrl = process.env.GNANI_API_BASE_URL || "https://api.vachana.ai";
    const isKeySet = apiKey && !apiKey.includes("placeholder") && !apiKey.includes("your_gnani");

    if (!isKeySet) {
      this.deductCredits(cost);
      return {
        success: true,
        fallbackToBrowser: true,
        creditsUsed: cost,
        remainingCredits: this.remainingCredits,
        message: `Gnani API Key not configured in .env. Deducted ${cost} test credits.`
      };
    }

    try {
      const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, "");
      const audioBuffer = Buffer.from(cleanBase64, "base64");

      const response = await fetch(`${baseUrl}/api/v1/stt`, {
        method: "POST",
        headers: {
          "Content-Type": "audio/wav",
          "X-API-Key-ID": apiKey,
          "X-Language-Code": language || process.env.GNANI_DEFAULT_LANG || "en-IN",
          "X-Model": process.env.GNANI_STT_MODEL || "prisma-v3.0"
        },
        body: audioBuffer
      });

      if (!response.ok) {
        return {
          success: false,
          fallbackToBrowser: true,
          creditsUsed: 0,
          remainingCredits: this.remainingCredits,
          message: `Gnani STT API error status: ${response.status}`
        };
      }

      const result: any = await response.json();
      this.deductCredits(cost);

      return {
        success: true,
        transcript: result.transcript || result.text || "",
        creditsUsed: cost,
        remainingCredits: this.remainingCredits
      };
    } catch (err: any) {
      console.error("[Gnani STT] Network exception:", err.message);
      return {
        success: false,
        fallbackToBrowser: true,
        creditsUsed: 0,
        remainingCredits: this.remainingCredits,
        message: "Gnani STT connection error."
      };
    }
  }
}

export const gnaniService = new GnaniService();
