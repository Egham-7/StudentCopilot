import { useState, useRef, useEffect, useCallback } from 'react'
import { File, FileAudio, FileVideo, FileSpreadsheet, Play, Pause, BookOpen } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { DialogTitle, DialogTrigger } from '@radix-ui/react-dialog'

interface LecturePlayerProps {
  fileUrl: string | null
  fileType: 'audio' | 'video' | 'pdf'
  title: string
}

const iconMap = {
  audio: FileAudio,
  video: FileVideo,
  pdf: FileSpreadsheet,
}

export default function LecturePlayer({ fileUrl, fileType, title }: LecturePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const getMediaRef = useCallback(() => {
    return fileType === 'audio' ? audioRef.current : videoRef.current;
  }, [fileType]);

  const handlePlayPause = useCallback(() => {
    const media = getMediaRef()
    if (media) {
      if (isPlaying) {
        media.pause()
      } else {
        media.play()
      }
      setIsPlaying(!isPlaying)
    }
  }, [isPlaying, getMediaRef])

  const handleTimeUpdate = useCallback(() => {
    const media = getMediaRef()
    if (media) {
      setCurrentTime(media.currentTime)
    }
  }, [getMediaRef])

  const handleLoadedMetadata = useCallback(() => {
    const media = getMediaRef()
    if (media) {
      setDuration(media.duration)
    }
  }, [getMediaRef])

  const handleSeek = useCallback((value: number[]) => {
    const media = getMediaRef()
    if (media) {
      media.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }, [getMediaRef])

  useEffect(() => {
    const media = getMediaRef()
    if (media) {
      media.addEventListener('timeupdate', handleTimeUpdate)
      media.addEventListener('loadedmetadata', handleLoadedMetadata)

      if (media.readyState >= 2) {
        setDuration(media.duration)
        setCurrentTime(media.currentTime)
      }

      return () => {
        media.removeEventListener('timeupdate', handleTimeUpdate)
        media.removeEventListener('loadedmetadata', handleLoadedMetadata)
      }
    }
  }, [handleTimeUpdate, handleLoadedMetadata, getMediaRef])

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const renderMediaPlayer = () => {
    switch (fileType) {
      case 'audio':
        return <audio ref={audioRef} src={fileUrl || undefined} className="w-full" />
      case 'video':
        return <video ref={videoRef} src={fileUrl || undefined} className="w-full rounded-lg" />
      case 'pdf':
        return (
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl || '')}&embedded=true`}
            className="w-full h-[500px] rounded-lg"
            title={`PDF viewer for ${title}`}
          />
        )
      default:
        return null
    }
  }

  const Icon = iconMap[fileType] || File

  if (!fileUrl) {
    return <div>No content found.</div>
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <BookOpen className="w-4 h-4 mr-2" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="p-6 h-96 overflow-y-auto">
        <DialogHeader className="text-2xl font-bold">
          <DialogTitle className='flex gap-2'>
            <Icon className="w-6 h-6" aria-hidden="true" />
            {title}
          </DialogTitle>
        </DialogHeader>
        {renderMediaPlayer()}
        {fileType !== 'pdf' && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <Slider
              value={[currentTime]}
              max={duration}
              step={1}
              onValueChange={handleSeek}
              className="w-full"
              aria-label="Seek"
            />
            <div className="flex justify-center mt-4">
              <Button onClick={handlePlayPause} className="px-8" aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause className="mr-2" aria-hidden="true" /> : <Play className="mr-2" aria-hidden="true" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
