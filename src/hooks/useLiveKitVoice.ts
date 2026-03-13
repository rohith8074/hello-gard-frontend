import { useState, useRef, useCallback } from "react";
import {
  Room,
  RoomEvent,
  RemoteTrack,
  Track,
  RemoteTrackPublication,
  RemoteParticipant,
  DisconnectReason,
  TranscriptionSegment,
  Participant,
  TrackPublication,
} from "livekit-client";
import { API_BASE_URL } from "@/CONSTS";

export type VoiceStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "agent_speaking"
  | "error";

export interface TranscriptMessage {
  role: "user" | "agent";
  text: string;
  timestamp: Date;
}


export const useLiveKitVoice = () => {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);

  const roomRef = useRef<Room | null>(null);
  const attachedAudioEls = useRef<HTMLAudioElement[]>([]);
  // Track segment IDs already added to avoid showing interim duplicates
  const shownSegmentIds = useRef<Set<string>>(new Set());

  const cleanupAudio = () => {
    attachedAudioEls.current.forEach((el) => {
      try { el.pause(); el.remove(); } catch {}
    });
    attachedAudioEls.current = [];
  };

  const startSession = useCallback(async (userId?: string) => {
    try {
      setStatus("connecting");
      setError(null);
      setTranscripts([]);

      // 1. Ask backend to create the Lyzr LiveKit session
      const res = await fetch(`${API_BASE_URL}/api/v1/session/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId })
      });

      if (!res.ok) {
        let detail = res.statusText;
        try {
          const errBody = await res.json();
          detail = errBody.detail || errBody.error || res.statusText;
        } catch {}
        throw new Error(`Session start failed: ${detail}`);
      }

      const data = await res.json();
      const { sessionId: sid, userToken, livekitUrl } = data;

      if (!userToken || !livekitUrl) {
        throw new Error("Invalid session response from backend (missing token or URL)");
      }

      console.log(`[LiveKit] Session started: ${sid} | Room: ${data.roomName}`);
      setSessionId(sid);

      // 2. Create and configure LiveKit Room
      const room = new Room({
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true },
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      // 3. Attach agent audio when their track is published
      room.on(
        RoomEvent.TrackSubscribed,
        (track: RemoteTrack, _pub: RemoteTrackPublication, _participant: RemoteParticipant) => {
          if (track.kind === Track.Kind.Audio) {
            const audioEl = track.attach();
            audioEl.autoplay = true;
            document.body.appendChild(audioEl);
            attachedAudioEls.current.push(audioEl);
            console.log("[LiveKit] Agent audio track subscribed");
          }
        }
      );

      // 4. Real-time transcription via LiveKit TranscriptionReceived event.
      //    Lyzr publishes STT results (user speech) and TTS source text (agent speech)
      //    as TranscriptionSegment[] — this is the correct way to get live text.
      room.on(
        RoomEvent.TranscriptionReceived,
        (segments: TranscriptionSegment[], participant?: Participant, _publication?: TrackPublication) => {
          if (!participant) return;
          for (const seg of segments) {
            // Only show final segments to avoid flickering interim results
            if (!seg.final) continue;
            // De-duplicate by segment ID (LiveKit may emit the same segment twice)
            if (shownSegmentIds.current.has(seg.id)) continue;
            shownSegmentIds.current.add(seg.id);

            const text = seg.text.trim();
            if (!text) continue;

            // participant.isLocal = user's speech (STT); remote = agent's speech (TTS text)
            const role: "user" | "agent" = participant.isLocal ? "user" : "agent";
            console.log(`[Transcript] [${role.toUpperCase()}] "${text}"`);
            setTranscripts((prev) => [...prev, { role, text, timestamp: new Date() }]);
          }
        }
      );

      // 5. Detect when agent is speaking via active speakers
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const agentSpeaking = speakers.some((p) => !p.isLocal);
        setStatus(agentSpeaking ? "agent_speaking" : "connected");
      });

      // 6. Handle room disconnection
      room.on(RoomEvent.Disconnected, (_reason?: DisconnectReason) => {
        console.log("[LiveKit] Room disconnected");
        cleanupAudio();
        setStatus("idle");
      });

      // 7. Connect to LiveKit room
      await room.connect(livekitUrl, userToken);
      console.log(`[LiveKit] Connected to room: ${room.name}`);

      // 8. Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true);
      console.log("[LiveKit] Microphone enabled");

      setStatus("connected");

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start session";
      console.error("[LiveKit] startSession error:", err);
      setError(msg);
      setStatus("error");
    }
  }, []);

  const disconnect = useCallback(async () => {
    console.log("[LiveKit] Disconnecting...");
    shownSegmentIds.current.clear();

    // 1. Mute mic + disconnect room
    try { await roomRef.current?.localParticipant.setMicrophoneEnabled(false); } catch {}
    roomRef.current?.disconnect();
    roomRef.current = null;

    // 2. Clean up audio elements
    cleanupAudio();

    // 3. Send collected transcript to backend with session end
    //    Lyzr REST transcript API returns 404 — we use what we captured via TranscriptionReceived
    if (sessionId) {
      try {
        const currentTranscripts = transcripts.map((t) => ({
          role: t.role,
          text: t.text,
          timestamp: t.timestamp.toISOString(),
        }));
        const res = await fetch(`${API_BASE_URL}/api/v1/session/end?session_id=${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: currentTranscripts }),
        });
        const result = await res.json();
        console.log(`[LiveKit] Session ended — ${result.turns ?? 0} transcript turns saved`);
      } catch (err) {
        console.error("[LiveKit] Session end call failed:", err);
      }
    }

    setStatus("idle");
    setSessionId(null);
    setError(null);
    // Keep transcripts visible for review after call ends
  }, [sessionId, transcripts]);

  return {
    status,
    error,
    sessionId,
    transcripts,
    startSession,
    disconnect,
    isConnected: status === "connected" || status === "agent_speaking",
  };
};
