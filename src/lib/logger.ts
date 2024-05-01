import path from "path"
import winston from "winston"
import { syslog } from "winston/lib/winston/config/index"

type LoggerOptions= {
  level: string
  rootPath: string
  fileName: string
  disableFile: boolean
  disableConsole: boolean
}

const DEFAULT_OPTIONS: LoggerOptions= {
  level: 'debug',
  disableFile: true,
  disableConsole: false,
  rootPath: '.',
  fileName: 'application.log'
}
class Logger{
  private _logger: winston.Logger;
  private level: string;
  private disableFile: boolean;
  private disableConsole: boolean;
  private rootPath: string;
  private fileName: string;

  constructor(options: LoggerOptions){
    this.level= options.level||DEFAULT_OPTIONS.level,
    this.disableFile= ('disableFile' in options)?options.disableFile:DEFAULT_OPTIONS.disableFile;
    this.disableConsole= ('disableConsole' in options)?options.disableConsole:DEFAULT_OPTIONS.disableConsole;
    this.rootPath= options.rootPath||DEFAULT_OPTIONS.rootPath;
    this.fileName= options.fileName||DEFAULT_OPTIONS.fileName;
    const transports: winston.transport[]= [];
    if(!this.disableFile){
      transports.push(new winston.transports.File({  filename: path.join(this.rootPath, this.fileName) }));
    }
    if(!this.disableConsole){
      transports.push(new winston.transports.Console());
    }
    this._logger = winston.createLogger({
      level: this.level,
      levels: syslog.levels,
      format: winston.format.combine(
        winston.format.align(),
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp, label }) => {
          return `${timestamp} [${level.toUpperCase()}] ${message}`;
        })
      ),
      transports
    });

  }
  configure(options: LoggerOptions){
    const logger= new Logger(options);
    Object.keys(this).forEach(key => this[key]= logger[key]);
  }
  info(message: string){
    this._logger.log('info', message);
  }
  debug(message: string){
    this._logger.log('debug', message);
  }
  error(message: string){
    this._logger.log('error', message);
  }
  warn(message: string){
    this._logger.log('warn', message);
  }
  crit(message: string){
    this._logger.log('crit', message);
  }
}

export const logger= new Logger(DEFAULT_OPTIONS);