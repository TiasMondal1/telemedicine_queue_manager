import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Monitor,
  MonitorOff,
  Volume2,
  VolumeX 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { videoService } from '@/services/video';

const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID || '';

export default function VideoRoom() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRemoteAudioMuted, setIsRemoteAudioMuted] = useState(false);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  // Join video call
  const { data: videoCredentials, isLoading } = useQuery({
    queryKey: ['video-credentials', appointmentId],
    queryFn: () => videoService.joinVideoCall(appointmentId!),
    enabled: !!appointmentId,
  });

  // End call mutation
  const endCallMutation = useMutation({
    mutationFn: () => videoService.endVideoCall(appointmentId!),
    onSuccess: () => {
      toast.success('Call ended');
      navigate(-1);
    },
  });

  // Initialize Agora
  useEffect(() => {
    if (!videoCredentials) return;

    const initAgora = async () => {
      try {
        // Create client
        const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        setClient(agoraClient);

        // Join channel
        await agoraClient.join(
          AGORA_APP_ID,
          videoCredentials.channelName,
          videoCredentials.token,
          videoCredentials.uid
        );

        // Create local tracks
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);

        // Play local video
        if (localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
        }

        // Publish local tracks
        await agoraClient.publish([audioTrack, videoTrack]);

        // Handle remote users
        agoraClient.on('user-published', async (user, mediaType) => {
          await agoraClient.subscribe(user, mediaType);

          if (mediaType === 'video') {
            setRemoteUsers((prev) => [...prev.filter((u) => u.uid !== user.uid), user]);
            
            // Play remote video
            setTimeout(() => {
              if (remoteVideoRef.current) {
                user.videoTrack?.play(remoteVideoRef.current);
              }
            }, 100);
          }

          if (mediaType === 'audio') {
            user.audioTrack?.play();
          }
        });

        agoraClient.on('user-unpublished', (user) => {
          setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        });

        agoraClient.on('user-left', (user) => {
          setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        });

        toast.success('Joined video call');
      } catch (error: any) {
        console.error('Failed to join:', error);
        toast.error('Failed to join video call');
      }
    };

    initAgora();

    // Cleanup
    return () => {
      if (client) {
        client.leave();
      }
      if (localAudioTrack) {
        localAudioTrack.close();
      }
      if (localVideoTrack) {
        localVideoTrack.close();
      }
    };
  }, [videoCredentials]);

  const toggleAudio = async () => {
    if (localAudioTrack) {
      await localAudioTrack.setEnabled(!isAudioMuted);
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = async () => {
    if (localVideoTrack) {
      await localVideoTrack.setEnabled(!isVideoMuted);
      setIsVideoMuted(!isVideoMuted);
    }
  };

  const toggleRemoteAudio = () => {
    remoteUsers.forEach((user) => {
      if (user.audioTrack) {
        user.audioTrack.setVolume(isRemoteAudioMuted ? 100 : 0);
      }
    });
    setIsRemoteAudioMuted(!isRemoteAudioMuted);
  };

  const handleEndCall = () => {
    if (client) {
      client.leave();
    }
    endCallMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-white">Loading video call...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Video Area */}
      <div className="flex-1 relative">
        {/* Remote Video (Main) */}
        <div className="w-full h-full bg-gray-900">
          {remoteUsers.length > 0 ? (
            <div
              ref={remoteVideoRef}
              className="w-full h-full"
              style={{ background: '#1a1a1a' }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white">
                <div className="h-24 w-24 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-4">
                  <Video className="h-12 w-12" />
                </div>
                <p className="text-lg">Waiting for other participant...</p>
              </div>
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-64 h-48 bg-gray-800 rounded-lg overflow-hidden shadow-xl border-2 border-gray-700">
          {!isVideoMuted ? (
            <div ref={localVideoRef} className="w-full h-full" />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-900">
              <VideoOff className="h-12 w-12 text-gray-500" />
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-white text-xs">
            You
          </div>
        </div>

        {/* Connection Status */}
        <div className="absolute top-4 left-4">
          <Card className="bg-black/70 border-none">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-white">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm">Connected</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-6 flex justify-center items-center gap-4">
        {/* Mute Audio */}
        <Button
          onClick={toggleAudio}
          variant={isAudioMuted ? 'destructive' : 'secondary'}
          size="lg"
          className="rounded-full h-14 w-14"
        >
          {isAudioMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        {/* Mute Video */}
        <Button
          onClick={toggleVideo}
          variant={isVideoMuted ? 'destructive' : 'secondary'}
          size="lg"
          className="rounded-full h-14 w-14"
        >
          {isVideoMuted ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
        </Button>

        {/* Remote Audio */}
        <Button
          onClick={toggleRemoteAudio}
          variant="secondary"
          size="lg"
          className="rounded-full h-14 w-14"
          disabled={remoteUsers.length === 0}
        >
          {isRemoteAudioMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
        </Button>

        {/* End Call */}
        <Button
          onClick={handleEndCall}
          variant="destructive"
          size="lg"
          className="rounded-full h-16 w-16"
        >
          <PhoneOff className="h-7 w-7" />
        </Button>
      </div>
    </div>
  );
}
