import { useState, useRef, useCallback } from "react";
import {
  AudioRecorder,
  AudioPlayer,
  encodeAudioForAPI,
  decodeBase64Audio,
} from "@/lib/audioUtils";
import { AGENT_ID, API_BASE_URL } from "@/CONSTS";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "speaking"
  | "error";

interface SessionResponse {
  sessionId: string;
  wsUrl: string;
  audioConfig: {
    sampleRate: number;
    format: string;
    channels: number;
    encoding: string;
  };
}

export interface TranscriptMessage {
  role: "user" | "agent";
  text: string;
  timestamp: Date;
}

export const useVoiceAgent = () => {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const backToListeningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const SPEAKING_IDLE_DEBOUNCE_MS = 900;

  const startSession = useCallback(async () => {
    try {
      setStatus("connecting");
      setError(null);

      // Start session via API - Backend now handles Agent ID internally for security
      const response = await fetch(`${API_BASE_URL}/api/v1/session/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to start session: ${response.statusText}`);
      }

      const data: SessionResponse & { roomName: string } = await response.json();
      console.log("Session started:", data);
      setSessionId(data.sessionId);
      setRoomName(data.roomName);

      // Initialize audio player
      playerRef.current = new AudioPlayer();

      // Connect to WebSocket
      const ws = new WebSocket(data.wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setStatus("connected");

        // Start audio recording
        recorderRef.current = new AudioRecorder((audioData) => {
          if (ws.readyState === WebSocket.OPEN) {
            const base64Audio = encodeAudioForAPI(audioData);
            ws.send(
              JSON.stringify({
                type: "audio",
                audio: base64Audio,
                sampleRate: 24000,
              })
            );
          }
        });
        recorderRef.current.start().catch((err) => {
          console.error("Failed to start recording:", err);
          setError("Microphone access denied");
          setStatus("error");
        });
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("Received message:", message.type, message);

          if (message.type === "audio" && message.audio) {
            setStatus("speaking");
            const audioData = decodeBase64Audio(message.audio);
            playerRef.current?.addToQueue(audioData);

            // Debounce: only flip back after no audio arrived for a bit
            if (backToListeningTimeoutRef.current) {
              clearTimeout(backToListeningTimeoutRef.current);
            }

            backToListeningTimeoutRef.current = setTimeout(() => {
              setStatus((current) =>
                current === "speaking" ? "connected" : current
              );
              backToListeningTimeoutRef.current = null;
            }, SPEAKING_IDLE_DEBOUNCE_MS);
          }

          // Handle transcript messages - check for role field or message type
          if (message.type === "transcript" || message.transcript || message.text) {
            const text = message.text || message.transcript || message.content;
            if (text) {
              // Determine role from message properties
              let role: "user" | "agent" = "user";

              if (message.role === "agent" || message.role === "assistant" ||
                message.source === "agent" || message.source === "assistant" ||
                message.type === "agent_transcript" || message.type === "response_transcript" ||
                message.type === "assistant_transcript" || message.speaker === "agent" ||
                message.speaker === "assistant") {
                role = "agent";
              } else if (message.role === "user" || message.source === "user" ||
                message.type === "user_transcript" || message.speaker === "user") {
                role = "user";
              }

              setTranscripts((prev) => [
                ...prev,
                { role, text, timestamp: new Date() },
              ]);
            }
          }
        } catch (err) {
          console.error("Error parsing message:", err);
        }
      };

      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("Connection error occurred");
        setStatus("error");
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        if (backToListeningTimeoutRef.current) {
          clearTimeout(backToListeningTimeoutRef.current);
          backToListeningTimeoutRef.current = null;
        }
        setStatus("idle");
      };
    } catch (err) {
      console.error("Failed to start session:", err);
      setError(err instanceof Error ? err.message : "Failed to start session");
      setStatus("error");
    }
  }, []);

  const disconnect = useCallback(async () => {
    console.log("Disconnecting...");
    
    // Call backend to end session if we have a sessionId
    if (sessionId) {
      try {
        await fetch(`${API_BASE_URL}/api/v1/session/end?session_id=${sessionId}`, {
          method: "POST"
        });
      } catch (err) {
        console.error("Failed to signal end of session to backend:", err);
      }
    }

    if (backToListeningTimeoutRef.current) {
      clearTimeout(backToListeningTimeoutRef.current);
      backToListeningTimeoutRef.current = null;
    }

    // Stop recording
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }

    // Stop audio player
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus("idle");
    setSessionId(null);
    setRoomName(null);
    setError(null);
    setTranscripts([]);
  }, [sessionId]);

  return {
    status,
    error,
    sessionId,
    transcripts,
    startSession,
    disconnect,
    isConnected: status === "connected" || status === "speaking",
  };
};
