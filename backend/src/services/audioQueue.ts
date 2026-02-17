import { Queue, Worker } from 'bullmq';
import { prisma } from '../index';
import { storageService } from './storage';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Piper TTS config
const PIPER_PATH = '/usr/local/bin/piper/piper';
const PIPER_VOICE = '/usr/local/share/piper-voices/en_US-lessac-medium.onnx';

export const audioQueue = new Queue('audio-generation', {
  connection: {
    url: REDIS_URL
  }
});

async function generateLocalTTS(text: string, outputPath: string): Promise<void> {
  // Sanitize text for shell
  const sanitizedText = text
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .substring(0, 5000); // Limit to 5000 chars for performance
  
  const command = `echo "${sanitizedText}" | ${PIPER_PATH} --model ${PIPER_VOICE} --output_file ${outputPath}`;
  
  const { stderr } = await execAsync(command);
  if (stderr && !stderr.includes('ms')) {
    console.warn('Piper stderr:', stderr);
  }
}

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
        const tempDir = '/tmp/deepread-audio';
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const tempFile = path.join(tempDir, `${jobId}.wav`);
        
        // Use local Piper TTS
        console.log(`Generating local TTS for job ${jobId}...`);
        await generateLocalTTS(text, tempFile);
        
        // Read generated audio
        const audioBuffer = fs.readFileSync(tempFile);
        
        // Calculate duration (rough estimate: ~150 words per minute)
        const wordCount = text.split(/\s+/).length;
        const duration = Math.ceil((wordCount / 150) * 60);
        
        // Upload to storage
        const storageKey = `audio/${userId}/${jobId}.wav`;
        await storageService.uploadBuffer(storageKey, audioBuffer, 'audio/wav');
        
        // Cleanup
        fs.unlinkSync(tempFile);

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
        console.error('Audio generation failed:', error);
        
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
      connection: {
        url: REDIS_URL
      },
      concurrency: 2 // Limit concurrent TTS to avoid overloading
    }
  );

  worker.on('completed', (job) => {
    console.log(`Audio job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Audio job ${job?.id} failed:`, err.message);
  });

  console.log('🎵 Local TTS worker started (Piper)');
}
