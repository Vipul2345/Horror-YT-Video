import fs from 'fs';
import path from 'path';

export class Logger {
  private logFilePath: string | null = null;

  constructor(jobDir?: string) {
    if (jobDir) {
      if (!fs.existsSync(jobDir)) {
        fs.mkdirSync(jobDir, { recursive: true });
      }
      this.logFilePath = path.join(jobDir, 'logs.txt');
    }
  }

  private sanitize(message: string): string {
    return message
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
      .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/g, 'Bearer [REDACTED_TOKEN]')
      .replace(/(client_secret[:=]\s*)[^\s&]+/gi, '$1[REDACTED_SECRET]')
      .replace(/(refresh_token[:=]\s*)[^\s&]+/gi, '$1[REDACTED_TOKEN]');
  }

  public log(stage: string, message: string, meta?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const cleanMsg = this.sanitize(message);
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    const formatted = `[${timestamp}] [${stage.toUpperCase()}] ${cleanMsg}${metaStr}`;

    console.log(formatted);

    if (this.logFilePath) {
      try {
        fs.appendFileSync(this.logFilePath, formatted + '\n', 'utf8');
      } catch (err) {
        console.error('Failed to append to log file:', err);
      }
    }
  }

  public info(stage: string, message: string, meta?: Record<string, any>) {
    this.log(stage, `INFO: ${message}`, meta);
  }

  public warn(stage: string, message: string, meta?: Record<string, any>) {
    this.log(stage, `WARN: ${message}`, meta);
  }

  public error(stage: string, message: string, error?: any) {
    const errText = error instanceof Error ? `${error.message}\n${error.stack}` : String(error || '');
    this.log(stage, `ERROR: ${message} - ${this.sanitize(errText)}`);
  }
}
