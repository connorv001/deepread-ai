import { Queue, Worker } from 'bullmq';
import { prisma } from '../index';
import { storageService } from './storage';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const audioQueue = new Queue('audio-generation', {
  connection: {
    url: REDIS_URL
  }
});

export function setupAudioQueue(): void {
  const worker = new Worker(
    'audio-generation',
    async (job) => {
      const { jobId, text, voiceId, userId } = job.data;

      // Update job status
      await prisma.audioJob.update({
        where: { id: jobId },
        data: { status: 'PROCESSING' }
      });

      try {
        // Call ElevenLabs API
        const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5
            }
          })
        });

        if (!response.ok) {
          throw new Error(`ElevenLabs API error: ${response.status}`);
        }

        // Get audio buffer
        const audioBuffer = Buffer.from(await response.arrayBuffer());

        // Upload to storage
        const storageKey = `audio/${userId}/${jobId}.mp3`;
        await storageService.uploadBuffer(storageKey, audioBuffer, 'audio/mpeg');

        // Calculate duration (rough estimate: ~150 words per minute)
        const wordCount = text.split(/\s+/).length;
        const duration = Math.ceil((wordCount / 150) * 60);

        // Update job as completed
        await prisma.audioJob.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            storageKey,
            duration,
            completedAt: new Date()
          }
        });

        return { success: true, storageKey, duration };
      } catch (error) {
        console.error('Audio generation error:', error);

        await prisma.audioJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });

        throw error;
      }
    },
    {
      connection: { url: REDIS_URL },
      concurrency: 2
    }
  );

  worker.on('failed', (job, error) => {
    console.error(`Audio job ${job?.id} failed:`, error);
  });

  console.log('🎵 Audio queue worker started');
}
