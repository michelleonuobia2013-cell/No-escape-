import type { MultiplayerPlayerState, ProximityPeerInfo } from '../game/types';
import {
  calculateDistance3D,
  calculateProximityGain,
  calculateStereoPan,
  formatProximityStatus,
  type Vec3Like,
} from './proximityMath';

export interface RtcSignalMessage {
  fromId: string;
  signalType: 'offer' | 'answer' | 'ice';
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

type SignalSender = (
  targetId: string,
  signalType: 'offer' | 'answer' | 'ice',
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit,
) => void;

interface PeerEntry {
  peerId: string;
  pc: RTCPeerConnection;
  pendingIce: RTCIceCandidateInit[];
  connected: boolean;
  remoteStream: MediaStream | null;
  audioEl: HTMLAudioElement | null;
  sourceNode: MediaStreamAudioSourceNode | null;
  pannerNode: StereoPannerNode | null;
  gainNode: GainNode | null;
  analyserNode: AnalyserNode | null;
  analyserBuf: Uint8Array<ArrayBuffer> | null;
  speaking: boolean;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export class ProximityVoiceManager {
  private selfId: string | null = null;
  private sendSignal: SignalSender;
  private onStatusChange: () => void;

  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private localStream: MediaStream | null = null;
  private localMuted = false;
  private voiceEnabled = false;
  private masterVolume = 1.0;

  private peers = new Map<string, PeerEntry>();

  constructor(sendSignal: SignalSender, onStatusChange: () => void) {
    this.sendSignal = sendSignal;
    this.onStatusChange = onStatusChange;
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.audioCtx = new Ctx();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public setMasterVolume(volume01: number, globalMuted: boolean) {
    this.masterVolume = globalMuted ? 0 : Math.max(0, Math.min(1, volume01));
    if (this.audioCtx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.audioCtx.currentTime, 0.04);
    }
  }

  public setSelfId(id: string | null) {
    this.selfId = id;
  }

  public isVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  public isLocalMuted(): boolean {
    return this.localMuted;
  }

  public async enableMic(): Promise<void> {
    this.ensureAudioContext();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone capture is not supported in this browser.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    this.localStream = stream;
    this.voiceEnabled = true;
    this.localMuted = false;

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      for (const peer of this.peers.values()) {
        const senders = peer.pc.getSenders();
        const existingAudioSender = senders.find((s) => s.track?.kind === 'audio');
        if (existingAudioSender) {
          await existingAudioSender.replaceTrack(audioTrack);
        } else {
          peer.pc.addTrack(audioTrack, stream);
        }
        await this.renegotiatePeer(peer);
      }
    }
    this.onStatusChange();
  }

  public disableMic() {
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }
    for (const peer of this.peers.values()) {
      let removed = false;
      for (const sender of peer.pc.getSenders()) {
        if (sender.track) {
          peer.pc.removeTrack(sender);
          removed = true;
        }
      }
      if (removed) {
        this.renegotiatePeer(peer).catch(() => {});
      }
    }
    this.voiceEnabled = false;
    this.localMuted = false;
    this.onStatusChange();
  }

  public toggleMuteMic(): boolean {
    if (!this.localStream) return this.localMuted;
    this.localMuted = !this.localMuted;
    for (const track of this.localStream.getAudioTracks()) {
      track.enabled = !this.localMuted;
    }
    this.onStatusChange();
    return this.localMuted;
  }

  public syncPeers(remotePlayers: MultiplayerPlayerState[]) {
    if (!this.selfId) return;
    const activeIds = new Set(remotePlayers.map((p) => p.id));

    for (const [pid, entry] of this.peers.entries()) {
      if (!activeIds.has(pid)) {
        this.teardownPeer(entry);
        this.peers.delete(pid);
      }
    }

    for (const rp of remotePlayers) {
      if (rp.id === this.selfId) continue;
      if (!this.peers.has(rp.id)) {
        const shouldInitiate = this.selfId < rp.id;
        this.createPeer(rp.id, shouldInitiate);
      }
    }
  }

  private createPeer(peerId: string, initiateOffer: boolean): PeerEntry {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    const entry: PeerEntry = {
      peerId,
      pc,
      pendingIce: [],
      connected: false,
      remoteStream: null,
      audioEl: null,
      sourceNode: null,
      pannerNode: null,
      gainNode: null,
      analyserNode: null,
      analyserBuf: null,
      speaking: false,
    };

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    } else if (initiateOffer) {
      // Allow receiving teammates' spatial voice even if local mic is off
      pc.addTransceiver('audio', { direction: 'recvonly' });
    }

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.sendSignal(peerId, 'ice', ev.candidate.toJSON());
      }
    };

    const syncConnState = () => {
      entry.connected =
        pc.connectionState === 'connected' ||
        pc.iceConnectionState === 'connected' ||
        pc.iceConnectionState === 'completed';
      this.onStatusChange();
    };
    pc.onconnectionstatechange = syncConnState;
    pc.oniceconnectionstatechange = syncConnState;

    pc.ontrack = (ev) => {
      const stream = ev.streams[0] || new MediaStream([ev.track]);
      this.attachRemoteAudioPipeline(entry, stream);
    };

    this.peers.set(peerId, entry);

    if (initiateOffer) {
      this.renegotiatePeer(entry).catch(() => {});
    }
    return entry;
  }

  private async renegotiatePeer(entry: PeerEntry) {
    if (entry.pc.signalingState !== 'stable') return;
    try {
      const offer = await entry.pc.createOffer();
      await entry.pc.setLocalDescription(offer);
      if (entry.pc.localDescription) {
        this.sendSignal(entry.peerId, 'offer', entry.pc.localDescription.toJSON());
      }
    } catch {
      // Ignore transient signaling race
    }
  }

  public async handleSignal(msg: RtcSignalMessage) {
    let entry = this.peers.get(msg.fromId);
    if (!entry) {
      entry = this.createPeer(msg.fromId, false);
    }

    try {
      if (msg.signalType === 'offer') {
        const desc = new RTCSessionDescription(msg.payload as RTCSessionDescriptionInit);
        // Polite peer handling on glare
        if (entry.pc.signalingState !== 'stable') {
          await entry.pc.setLocalDescription({ type: 'rollback' });
        }
        await entry.pc.setRemoteDescription(desc);
        if (this.localStream) {
          const track = this.localStream.getAudioTracks()[0];
          if (track && !entry.pc.getSenders().some((s) => s.track === track)) {
            entry.pc.addTrack(track, this.localStream);
          }
        }
        const answer = await entry.pc.createAnswer();
        await entry.pc.setLocalDescription(answer);
        if (entry.pc.localDescription) {
          this.sendSignal(entry.peerId, 'answer', entry.pc.localDescription.toJSON());
        }
        await this.flushPendingIce(entry);
      } else if (msg.signalType === 'answer') {
        const desc = new RTCSessionDescription(msg.payload as RTCSessionDescriptionInit);
        if (entry.pc.signalingState === 'have-local-offer') {
          await entry.pc.setRemoteDescription(desc);
          await this.flushPendingIce(entry);
        }
      } else if (msg.signalType === 'ice') {
        const ice = msg.payload as RTCIceCandidateInit;
        if (entry.pc.remoteDescription) {
          await entry.pc.addIceCandidate(new RTCIceCandidate(ice));
        } else {
          entry.pendingIce.push(ice);
        }
      }
    } catch {
      // Resilient against stale/out-of-order signaling packets
    }
  }

  private async flushPendingIce(entry: PeerEntry) {
    while (entry.pendingIce.length > 0) {
      const candidate = entry.pendingIce.shift();
      if (candidate) {
        await entry.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
    }
  }

  private attachRemoteAudioPipeline(entry: PeerEntry, stream: MediaStream) {
    entry.remoteStream = stream;

    // Hidden muted audio sink ensures Chromium decodes incoming WebRTC audio frames
    if (!entry.audioEl && typeof document !== 'undefined') {
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.muted = true;
      audioEl.setAttribute('playsinline', 'true');
      audioEl.srcObject = stream;
      audioEl.play().catch(() => {});
      entry.audioEl = audioEl;
    } else if (entry.audioEl) {
      entry.audioEl.srcObject = stream;
    }

    const ctx = this.ensureAudioContext();
    if (!ctx || !this.masterGain) return;

    if (entry.sourceNode) {
      entry.sourceNode.disconnect();
    }

    const source = ctx.createMediaStreamSource(stream);
    const panner = ctx.createStereoPanner();
    const gain = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;

    source.connect(panner);
    panner.connect(gain);
    gain.connect(analyser);
    analyser.connect(this.masterGain);

    entry.sourceNode = source;
    entry.pannerNode = panner;
    entry.gainNode = gain;
    entry.analyserNode = analyser;
    entry.analyserBuf = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
  }

  public updateSpatialPositions(
    listenerPos: Vec3Like,
    listenerYaw: number,
    remotePlayers: MultiplayerPlayerState[],
  ): ProximityPeerInfo[] {
    const now = this.audioCtx?.currentTime ?? 0;
    const infos: ProximityPeerInfo[] = [];

    for (const rp of remotePlayers) {
      const speakerPos = { x: rp.x, y: rp.y, z: rp.z };
      const distance = calculateDistance3D(listenerPos, speakerPos);
      const gain = calculateProximityGain(listenerPos, speakerPos);
      const pan = calculateStereoPan(listenerPos, listenerYaw, speakerPos);

      const entry = this.peers.get(rp.id);
      let speaking = false;

      if (entry) {
        if (entry.gainNode && this.audioCtx) {
          entry.gainNode.gain.setTargetAtTime(gain, now, 0.05);
        }
        if (entry.pannerNode && this.audioCtx) {
          entry.pannerNode.pan.setTargetAtTime(pan, now, 0.05);
        }
        if (entry.analyserNode && entry.analyserBuf) {
          entry.analyserNode.getByteFrequencyData(entry.analyserBuf);
          let sum = 0;
          for (let i = 0; i < entry.analyserBuf.length; i++) {
            sum += entry.analyserBuf[i];
          }
          const avg = sum / entry.analyserBuf.length;
          speaking = avg > 14 && gain > 0.02;
          entry.speaking = speaking;
        }
      }

      infos.push({
        id: rp.id,
        username: rp.username,
        distance,
        gain,
        pan,
        clarityLabel: formatProximityStatus(distance),
        speaking,
        connected: Boolean(entry?.connected),
        voiceActive: Boolean(rp.voiceActive && !rp.voiceMuted),
      });
    }

    return infos;
  }

  private teardownPeer(entry: PeerEntry) {
    entry.sourceNode?.disconnect();
    entry.pannerNode?.disconnect();
    entry.gainNode?.disconnect();
    entry.analyserNode?.disconnect();
    if (entry.audioEl) {
      entry.audioEl.srcObject = null;
    }
    entry.pc.close();
  }

  public dispose() {
    this.disableMic();
    for (const entry of this.peers.values()) {
      this.teardownPeer(entry);
    }
    this.peers.clear();
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
      this.masterGain = null;
    }
  }
}
