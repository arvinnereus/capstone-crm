"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff } from "lucide-react";

import { cn } from "@/lib/utils";

type VoiceState = "idle" | "connecting" | "listening" | "thinking" | "speaking";
type Line = { role: "user" | "joseph"; text: string };

const IDLE_TIMEOUT_MS = 120_000; // auto-hang-up after 2 min of silence — Realtime bills per minute

const STATE_LABEL: Record<VoiceState, string> = {
  idle: "tap to talk",
  connecting: "establishing link…",
  listening: "listening",
  thinking: "reading the CRM…",
  speaking: "Joseph is speaking",
};

/**
 * The HUD. Concentric rings rotate at their own speeds and directions; each
 * conversation state changes the tempo, so the ring stack reads as a status
 * light you can interpret from across the room. While Joseph speaks, the core
 * also scales with his actual audio level.
 */
function JosephHud({ state, muted, onClick }: { state: VoiceState; muted: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-state={muted && state !== "idle" ? "muted" : state}
      aria-label={state === "idle" ? "Start talking to Joseph" : "End voice session"}
      className="hud group relative aspect-square w-full max-w-[280px] rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
    >
      <svg viewBox="0 0 200 200" className="size-full overflow-visible">
        <defs>
          <radialGradient id="joseph-core" cx="50%" cy="45%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="70%" stopColor="var(--primary)" stopOpacity="0.04" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="joseph-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* outermost hairline + fine ticks */}
        <g className="hud-rot hud-rot--cw hud-dur-90">
          <circle className="hud-ring" cx="100" cy="100" r="96" strokeDasharray="1.5 6" opacity="0.35" />
        </g>

        {/* heavy arc segments — the brightest element, like the reference */}
        <g className="hud-rot hud-rot--ccw hud-dur-28">
          <circle
            className="hud-ring hud-ring--bright"
            cx="100"
            cy="100"
            r="88"
            strokeWidth="2.5"
            strokeDasharray="70 38 26 60 14 345"
            filter="url(#joseph-glow)"
          />
        </g>

        {/* dotted data ring */}
        <g className="hud-rot hud-rot--cw hud-dur-46">
          <circle className="hud-ring" cx="100" cy="100" r="79" strokeDasharray="1 7" opacity="0.5" />
        </g>

        {/* block segments */}
        <g className="hud-rot hud-rot--ccw hud-dur-34">
          <circle
            className="hud-ring"
            cx="100"
            cy="100"
            r="70"
            strokeWidth="6"
            strokeDasharray="9 7 9 7 9 120"
            opacity="0.45"
          />
        </g>

        {/* inner sweep */}
        <g className="hud-rot hud-rot--cw hud-dur-18">
          <circle
            className="hud-ring hud-ring--bright"
            cx="100"
            cy="100"
            r="60"
            strokeWidth="2"
            strokeDasharray="100 277"
            filter="url(#joseph-glow)"
          />
        </g>

        {/* core */}
        <circle cx="100" cy="100" r="50" fill="url(#joseph-core)" />
        <circle className="hud-ring hud-core-ring" cx="100" cy="100" r="50" strokeWidth="1.25" opacity="0.75" />
        <circle className="hud-ring" cx="100" cy="100" r="44" strokeDasharray="2 4" opacity="0.3" />

        <text
          x="100"
          y="103"
          textAnchor="middle"
          className="hud-wordmark"
          fontSize="9"
          letterSpacing="1.4"
        >
          J.O.S.E.P.H
        </text>
      </svg>
    </button>
  );
}

export function VoiceOrb({ brandLabel }: { brandLabel: string }) {
  const [state, setState] = useState<VoiceState>("idle");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const lastActivityRef = useRef<number>(0);
  const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speakingRef = useRef<string>("");
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const active = state !== "idle";

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const hangUp = useCallback(() => {
    if (idleTimerRef.current) {
      clearInterval(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    dcRef.current?.close();
    dcRef.current = null;
    micRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    hudRef.current?.style.setProperty("--hud-level", "0");
    speakingRef.current = "";
    setMuted(false);
    setState("idle");
  }, []);

  // Always release the mic if the user navigates away mid-call.
  useEffect(() => hangUp, [hangUp]);

  /** Drive the core's scale from Joseph's actual output level. */
  const startLevelMeter = useCallback((stream: MediaStream) => {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const bins = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(bins);
        let sum = 0;
        for (let i = 0; i < bins.length; i++) sum += bins[i];
        const level = Math.min(1, sum / bins.length / 90);
        hudRef.current?.style.setProperty("--hud-level", level.toFixed(3));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // level meter is decorative — never let it break the call
    }
  }, []);

  const runTool = useCallback(async (callId: string, name: string, rawArgs: string) => {
    setState("thinking");
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(rawArgs || "{}");
    } catch {
      // malformed arguments — send the tool an empty object and let it default
    }
    let result: unknown;
    try {
      const res = await fetch("/api/voice/tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, arguments: args }),
      });
      const data = (await res.json()) as { result?: unknown; error?: string };
      result = res.ok ? data.result : { error: data.error ?? "lookup failed" };
    } catch (e) {
      result = { error: e instanceof Error ? e.message : "lookup failed" };
    }
    const dc = dcRef.current;
    if (dc?.readyState !== "open") return;
    dc.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: { type: "function_call_output", call_id: callId, output: JSON.stringify(result) },
      })
    );
    dc.send(JSON.stringify({ type: "response.create" }));
  }, []);

  const handleEvent = useCallback(
    (msg: Record<string, unknown>) => {
      lastActivityRef.current = Date.now();
      const type = String(msg.type ?? "");

      // Joseph's speech, streamed as text. Event name differs across API versions.
      if (type === "response.output_audio_transcript.delta" || type === "response.audio_transcript.delta") {
        speakingRef.current += String(msg.delta ?? "");
        setState("speaking");
        setLines((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "joseph") next[next.length - 1] = { role: "joseph", text: speakingRef.current };
          else next.push({ role: "joseph", text: speakingRef.current });
          return next;
        });
        return;
      }

      if (type === "conversation.item.input_audio_transcription.completed") {
        const text = String(msg.transcript ?? "").trim();
        if (text) setLines((prev) => [...prev, { role: "user", text }]);
        return;
      }

      if (type === "input_audio_buffer.speech_started") {
        speakingRef.current = "";
        setState("listening");
        return;
      }

      if (type === "response.function_call_arguments.done") {
        void runTool(String(msg.call_id ?? ""), String(msg.name ?? ""), String(msg.arguments ?? "{}"));
        return;
      }

      if (type === "response.done" || type === "output_audio_buffer.stopped") {
        speakingRef.current = "";
        setState((s) => (s === "idle" ? s : "listening"));
        return;
      }

      if (type === "error") {
        const err = msg.error as { message?: string } | undefined;
        setError(err?.message ?? "Voice session error");
      }
    },
    [runTool]
  );

  const startCall = useCallback(async () => {
    setError(null);
    setState("connecting");
    try {
      const tokenRes = await fetch("/api/voice/token", { method: "POST" });
      const token = (await tokenRes.json()) as { value?: string; model?: string; error?: string };
      if (!tokenRes.ok || !token.value) throw new Error(token.error ?? "Could not start a voice session");

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      if (!audioRef.current) {
        const el = document.createElement("audio");
        el.autoplay = true;
        audioRef.current = el;
      }
      pc.ontrack = (e) => {
        if (audioRef.current) audioRef.current.srcObject = e.streams[0];
        startLevelMeter(e.streams[0]);
      };

      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micRef.current = mic;
      mic.getTracks().forEach((track) => pc.addTrack(track, mic));

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = (e) => {
        try {
          handleEvent(JSON.parse(e.data));
        } catch {
          // ignore non-JSON frames
        }
      };
      dc.onopen = () => {
        lastActivityRef.current = Date.now();
        setState("listening");
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(
        `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(token.model ?? "gpt-realtime")}`,
        {
          method: "POST",
          body: offer.sdp,
          headers: { Authorization: `Bearer ${token.value}`, "Content-Type": "application/sdp" },
        }
      );
      if (!sdpRes.ok) throw new Error(`OpenAI refused the connection (${sdpRes.status})`);
      await pc.setRemoteDescription({ type: "answer", sdp: await sdpRes.text() });

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") hangUp();
      };

      lastActivityRef.current = Date.now();
      idleTimerRef.current = setInterval(() => {
        if (Date.now() - lastActivityRef.current > IDLE_TIMEOUT_MS) hangUp();
      }, 10_000);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not start voice";
      setError(
        message.includes("Permission denied") || message.includes("NotAllowed")
          ? "Microphone access was blocked. Allow the mic for this site and try again."
          : message
      );
      hangUp();
    }
  }, [handleEvent, hangUp, startLevelMeter]);

  const toggleMute = () => {
    const mic = micRef.current;
    if (!mic) return;
    const next = !muted;
    mic.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <style>{`
        @keyframes hud-cw  { to { transform: rotate(360deg); } }
        @keyframes hud-ccw { to { transform: rotate(-360deg); } }
        @keyframes hud-breathe { 0%,100% { opacity:.55 } 50% { opacity:1 } }

        /* the panel is always dark, so the live colour is a fixed bright orange
           rather than a theme token that would dim in light mode */
        .hud { --hud-level: 0; --hud-speed: 1; --hud-live: oklch(0.78 0.175 55); }
        .hud-rot { transform-origin: 100px 100px; animation-timing-function: linear; animation-iteration-count: infinite; }
        .hud-rot--cw  { animation-name: hud-cw; }
        .hud-rot--ccw { animation-name: hud-ccw; }
        .hud-dur-90 { animation-duration: calc(90s / var(--hud-speed)); }
        .hud-dur-46 { animation-duration: calc(46s / var(--hud-speed)); }
        .hud-dur-34 { animation-duration: calc(34s / var(--hud-speed)); }
        .hud-dur-28 { animation-duration: calc(28s / var(--hud-speed)); }
        .hud-dur-18 { animation-duration: calc(18s / var(--hud-speed)); }

        .hud-ring { fill: none; stroke: var(--primary); stroke-linecap: round; }
        .hud-ring--bright { stroke: var(--primary); }
        .hud-wordmark {
          fill: var(--primary); font-family: var(--font-geist-mono), ui-monospace, monospace;
          opacity: .85; text-transform: uppercase;
        }
        .hud-core-ring { transition: transform .08s linear; transform-origin: 100px 100px; }

        /* ── states ─────────────────────────────────────────────── */
        .hud[data-state="idle"]        { --hud-speed: .5; opacity: .5; }
        .hud[data-state="idle"]:hover  { opacity: .8; }
        .hud[data-state="connecting"]  { --hud-speed: 2.2; }
        .hud[data-state="connecting"] .hud-ring--bright { animation: hud-breathe 1s ease-in-out infinite; }
        .hud[data-state="listening"]   { --hud-speed: 1; }
        .hud[data-state="thinking"]    { --hud-speed: 5; }
        .hud[data-state="thinking"] .hud-ring--bright { animation: hud-breathe .55s ease-in-out infinite; }
        .hud[data-state="speaking"]    { --hud-speed: 2.4; }
        .hud[data-state="speaking"] .hud-core-ring {
          transform: scale(calc(1 + var(--hud-level) * .085));
        }
        /* wordmark goes orange whenever the session is live, teal when dormant */
        .hud[data-state="connecting"] .hud-wordmark,
        .hud[data-state="listening"] .hud-wordmark,
        .hud[data-state="thinking"] .hud-wordmark,
        .hud[data-state="speaking"] .hud-wordmark {
          fill: var(--hud-live);
          opacity: 1;
          filter: drop-shadow(0 0 5px color-mix(in oklab, var(--hud-live) 60%, transparent));
        }

        .hud[data-state="muted"]       { --hud-speed: .4; opacity: .4; }
        .hud[data-state="muted"] .hud-ring { stroke: var(--muted-foreground); }
        .hud[data-state="muted"] .hud-wordmark { fill: var(--muted-foreground); }

        .hud, .hud .hud-ring, .hud .hud-wordmark { transition: opacity .35s ease, stroke .35s ease, fill .35s ease, filter .35s ease; }

        @media (prefers-reduced-motion: reduce) {
          .hud-rot { animation: none !important; }
          .hud-ring--bright { animation: none !important; }
        }
      `}</style>

      <div
        ref={hudRef}
        className="flex flex-col items-center gap-3 rounded-lg border p-6"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, color-mix(in oklab, var(--primary) 9%, #071018) 0%, #08131c 55%, #060d14 100%)",
        }}
      >
        <JosephHud state={state} muted={muted} onClick={active ? hangUp : () => void startCall()} />

        <p
          className={cn(
            "font-mono text-xs tracking-wide",
            active ? "text-primary" : "text-muted-foreground"
          )}
        >
          {muted && active ? "muted" : STATE_LABEL[state]}
        </p>

        <p className="text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
          Just One System, Every Pipeline Handled
        </p>

        {active && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {muted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
              {muted ? "Unmute" : "Mute"}
            </button>
            <button
              type="button"
              onClick={hangUp}
              className="flex items-center gap-1.5 rounded-md border border-destructive/40 px-2.5 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10"
            >
              <PhoneOff className="size-3.5" />
              End
            </button>
          </div>
        )}

        {!active && lines.length === 0 && (
          <p className="max-w-sm text-center text-xs text-muted-foreground">
            Ask out loud — “who should I call today?” Answers come from live {brandLabel} data.
          </p>
        )}

        {error && <p className="max-w-sm text-center text-xs text-destructive">{error}</p>}
      </div>

      {lines.length > 0 && (
        <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border bg-card p-3">
          {lines.map((l, i) => (
            <p key={i} className="text-sm leading-relaxed">
              <span
                className={cn(
                  "mr-2 font-mono text-[10px] uppercase tracking-wide",
                  l.role === "joseph" ? "text-primary" : "text-muted-foreground"
                )}
              >
                {l.role === "joseph" ? "Joseph" : "You"}
              </span>
              {l.text}
            </p>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      )}
    </div>
  );
}
